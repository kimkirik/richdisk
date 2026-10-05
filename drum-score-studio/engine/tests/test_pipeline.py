"""Signal/MIDI regressions. Optional real model test: --real-models."""
from pathlib import Path
import sys
import tempfile
import unittest
from threading import Event

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import numpy as np
import soundfile as sf
from pipeline import DrumEngine, decode_audio, export_performance_midi, pick_events, track_beats, Cancelled, check_cancel

REAL_MODELS = "--real-models" in sys.argv
if REAL_MODELS:
    sys.argv.remove("--real-models")


class PipelineTests(unittest.TestCase):
    def test_silence_does_not_invent_a_tempo_or_notes(self):
        with tempfile.TemporaryDirectory() as directory:
            stem = Path(directory) / "silent.wav"
            sf.write(stem, np.zeros((44100, 2)), 44100)
            self.assertEqual(pick_events(np.zeros((101, 5)), stem, 1, 62), [])
            bpm, beats, warnings = track_beats(stem, 1, None)
            self.assertIsNone(bpm)
            self.assertEqual(beats, [])
            self.assertTrue(warnings)

    def test_simultaneous_hits_and_rolls_survive_export(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            stem = directory / "stem.wav"
            sf.write(stem, np.random.default_rng(1).normal(0, .1, (44100, 2)), 44100)
            prediction = np.zeros((101, 5), dtype=np.float32)
            prediction[10, [0, 1, 3]] = .9
            prediction[15, 1] = .8
            prediction[98, 2] = .9
            events = pick_events(prediction, stem, 1, 62)
            self.assertEqual(len(events), 5)
            self.assertEqual(sum(e["time"] == .1 for e in events), 3)
            export_performance_midi(events, directory / "test.mid", 112)
            import pretty_midi
            notes = pretty_midi.PrettyMIDI(str(directory / "test.mid")).instruments[0].notes
            self.assertEqual(len(notes), 5)
            for note, event in zip(sorted(notes, key=lambda n: (n.start, n.pitch)),
                                   sorted(events, key=lambda e: (e["time"], e["midi"]))):
                self.assertAlmostEqual(note.start, event["time"], delta=.001)
                self.assertEqual(note.velocity, event["velocity"])

    def test_bad_audio_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "bad.mp3"
            source.write_bytes(b"not an audio file")
            with self.assertRaises(ValueError):
                decode_audio(source, Path(directory) / "out.wav")

    def test_mp3_decode_keeps_duration(self):
        import imageio_ffmpeg
        import subprocess
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            time = np.arange(44100) / 44100
            sf.write(directory / "test.wav", .2 * np.sin(2 * np.pi * 100 * time), 44100)
            subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-loglevel", "error", "-i",
                            str(directory / "test.wav"), str(directory / "test.mp3")], check=True)
            duration = decode_audio(directory / "test.mp3", directory / "decoded.wav")
            self.assertAlmostEqual(duration, 1, delta=.025)

    def test_manual_tempo_and_cancel(self):
        bpm, beats, _ = track_beats(Path("unused"), 8, 137.25)
        self.assertEqual(bpm, 137.25)
        self.assertAlmostEqual(beats[1], 60 / bpm, places=5)
        cancel = Event()
        cancel.set()
        with self.assertRaises(Cancelled):
            check_cancel(cancel)

    @unittest.skipUnless(REAL_MODELS, "Pass --real-models to run pretrained inference")
    def test_real_separation_transcription_pipeline(self):
        # Use procedurally generated audio, not canned predictions. This proves
        # the runtime executes; it is not a benchmark of real-song accuracy.
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            sr, duration = 44100, 6
            time = np.arange(sr * duration) / sr
            wave = .09 * np.sin(2 * np.pi * 220 * time) + .06 * np.sin(2 * np.pi * 55 * time)
            rng = np.random.default_rng(83)
            for start in np.arange(.25, duration - .2, .25):
                index = int(start * sr)
                t = np.arange(int(.18 * sr)) / sr
                hit = rng.normal(0, .16, len(t)) * np.exp(-t * 40)
                if round((start - .25) * 4) % 4 == 0:
                    hit += .7 * np.sin(2 * np.pi * 75 * t) * np.exp(-t * 22)
                wave[index:index + len(t)] += hit
            source = directory / "input.wav"
            sf.write(source, np.stack([wave, wave * .91], axis=1), sr)
            result = DrumEngine().run(source, directory, input_is_drums=False, sensitivity=62,
                                      bpm=120, progress=lambda p, d: print(p, d, flush=True), cancel=Event())
            self.assertGreater(len(result["events"]), 0)
            self.assertEqual(result["models"]["transcription"], "ADTOF Frame_RNN")
            self.assertEqual(sf.info(directory / "drums.wav").frames, len(wave))
            self.assertTrue((directory / "performance.mid").is_file())
            print("Real pipeline:", len(result["events"]), "hits", flush=True)


if __name__ == "__main__":
    unittest.main()
