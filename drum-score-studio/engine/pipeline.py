"""Local music → isolated drums → learned onsets. No hosted inference services."""
from __future__ import annotations

import os
import subprocess
from pathlib import Path
from threading import Event
from typing import Callable

ENGINE_DIR = Path(__file__).resolve().parent
os.environ.setdefault("TORCH_HOME", str(ENGINE_DIR / ".cache" / "torch"))
os.environ.setdefault("NUMBA_CACHE_DIR", str(ENGINE_DIR / ".cache" / "numba"))

import numpy as np
import soundfile as sf
import torch

SR = 44100
FPS = 100
# The drums-specialist member of the official htdemucs_ft ensemble. Its drum
# output has weight 1; the other three ensemble members have drum weight 0.
SEPARATOR = "f7e0c4bc"
CLASSES = ("kick", "snare", "tom", "hat", "cymbal")
MIDI = (36, 38, 47, 42, 49)
BASE_THRESHOLDS = np.array([0.22, 0.24, 0.32, 0.22, 0.30])
Progress = Callable[[int, str], None]


class Cancelled(Exception):
    pass


def check_cancel(cancel: Event) -> None:
    if cancel.is_set():
        raise Cancelled("분석을 취소했습니다.")


def decode_audio(source: Path, target: Path) -> float:
    import imageio_ffmpeg

    # Output duration is capped at 721 s so compressed inputs cannot expand
    # without bound. Protocols are restricted to local file decoding.
    result = subprocess.run([
        imageio_ffmpeg.get_ffmpeg_exe(), "-nostdin", "-hide_banner", "-loglevel", "error",
        "-protocol_whitelist", "file,pipe", "-i", str(source), "-t", "721",
        "-vn", "-ac", "2", "-ar", str(SR), "-c:a", "pcm_f32le", "-y", str(target),
    ], capture_output=True, timeout=180)
    if result.returncode:
        raise ValueError("오디오를 읽지 못했습니다. MP3, WAV, M4A, FLAC 파일을 확인해 주세요.")
    info = sf.info(target)
    if not 0.1 <= info.duration <= 720:
        raise ValueError("0.1초 이상, 12분 이하의 음악 파일을 선택해 주세요.")
    return float(info.duration)


class DrumEngine:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        torch.set_num_threads(max(1, min(4, os.cpu_count() or 1)))
        self.separator = None
        self.transcriber = None
        self.processor = None

    def load_separator(self):
        if self.separator is None:
            from demucs.pretrained import get_model

            model = get_model(SEPARATOR)
            if model.samplerate != SR or "drums" not in model.sources:
                raise RuntimeError("드럼 분리 모델의 규격이 맞지 않습니다.")
            self.separator = model.eval().to(self.device)
        return self.separator

    def load_transcriber(self):
        if self.transcriber is None:
            from adtof_pytorch import create_frame_rnn_model, get_default_weights_path
            from adtof_pytorch.audio import create_adtof_processor

            self.processor = create_adtof_processor()
            weights = get_default_weights_path()
            if not weights or not Path(weights).is_file():
                raise RuntimeError("ADTOF 학습 가중치가 없습니다. 설치를 다시 실행해 주세요.")
            # Upstream allows absent/mismatched weights and random inference;
            # this integration must fail closed instead.
            model = create_frame_rnn_model(self.processor.get_n_bins())
            checkpoint = torch.load(weights, map_location="cpu", weights_only=True)
            model.load_state_dict(checkpoint.get("model_weights", checkpoint), strict=True)
            self.transcriber = model.eval().to(self.device)
        return self.transcriber

    def separate(self, source: Path, target: Path, progress: Progress, cancel: Event):
        from demucs.apply import apply_model

        progress(8, "고품질 드럼 분리 모델 준비 중 · 첫 실행에는 가중치를 내려받습니다")
        model = self.load_separator()
        drum_index = model.sources.index("drums")
        with sf.SoundFile(source) as audio, sf.SoundFile(
            target, "w", samplerate=SR, channels=2, subtype="FLOAT"
        ) as output:
            # Work with bounded audio chunks, preserving two seconds of context
            # on both sides. Write only the central region, keeping exact length.
            chunk = 24 * SR
            context = 2 * SR
            for start in range(0, len(audio), chunk):
                check_cancel(cancel)
                stop = min(len(audio), start + chunk)
                left, right = max(0, start - context), min(len(audio), stop + context)
                audio.seek(left)
                wave = torch.from_numpy(audio.read(right - left, dtype="float32", always_2d=True).T.copy())
                mean, scale = wave.mean(), wave.std()
                if scale < 1e-8:
                    drums = np.zeros((stop - start, 2), dtype=np.float32)
                else:
                    with torch.inference_mode():
                        separated = apply_model(
                            model, ((wave - mean) / scale)[None], device=self.device,
                            split=True, segment=6, shifts=1, overlap=0.5, progress=False,
                        )[0, drum_index].cpu()
                    separated = separated * scale + mean
                    drums = separated[:, start - left:stop - left].T.numpy()
                output.write(drums)
                progress(10 + round(50 * stop / len(audio)), "보컬·베이스·반주에서 드럼을 분리하고 있어요")
        check_cancel(cancel)

    def activations(self, stem: Path, progress: Progress, cancel: Event) -> np.ndarray:
        progress(63, "드럼 전용 채보 모델을 준비하고 있어요")
        model = self.load_transcriber()
        info = sf.info(stem)
        frame_count = int(np.floor(info.frames / 441)) + 1
        output = np.zeros((frame_count, len(CLASSES)), dtype=np.float32)
        # Bidirectional GRUs need context. Infer overlapping 20 s windows with
        # two-second margins and discard edge predictions, then peak-pick once
        # globally so chunk boundaries never double or truncate a hit.
        core, margin = 2000, 200
        with sf.SoundFile(stem) as audio:
            for start in range(0, frame_count, core):
                check_cancel(cancel)
                stop = min(frame_count, start + core)
                left, right = max(0, start - margin), min(frame_count, stop + margin)
                audio.seek(min(info.frames, left * 441))
                wave = audio.read(min(info.frames - left * 441, (right - left) * 441),
                                  dtype="float32", always_2d=True)
                mono = wave.mean(axis=1)
                # Antiphase stereo can cancel a drum stem when collapsed.
                if np.mean(mono ** 2) < np.mean(wave ** 2) * 0.05:
                    mono = wave[:, int(np.argmax(np.mean(wave ** 2, axis=0)))]
                spectrogram = self.processor.apply_filterbank(self.processor.compute_stft(mono))
                tensor = torch.from_numpy(spectrogram.T.copy())[None, :, :, None].to(self.device)
                with torch.inference_mode():
                    prediction = model(tensor)[0].cpu().numpy()
                output[start:stop] = prediction[start - left:stop - left]
                progress(65 + round(21 * stop / frame_count), "킥·스네어·탐·하이햇·심벌의 타격 시점을 찾고 있어요")
        return output

    def run(self, source: Path, directory: Path, *, input_is_drums: bool, sensitivity: int,
            bpm: float | None, progress: Progress, cancel: Event) -> dict:
        decoded, stem = directory / "decoded.wav", directory / "drums.wav"
        progress(3, "음악 파일을 읽고 있어요")
        duration = decode_audio(source, decoded)
        check_cancel(cancel)
        if input_is_drums:
            decoded.replace(stem)
            progress(60, "드럼 전용 파일 · 분리 단계를 건너뜁니다")
        else:
            self.separate(decoded, stem, progress, cancel)
        prediction = self.activations(stem, progress, cancel)
        check_cancel(cancel)
        progress(88, "타격 강도와 박자 변화를 정리하고 있어요")
        events = pick_events(prediction, stem, duration, sensitivity)
        # Always retain the detected beat map so switching Manual → Auto in the
        # editor does not require running the neural models again.
        tempo, beats, warnings = track_beats(stem, duration, None)
        warnings.insert(0, "자동 분류는 킥·스네어·하이햇·탐·심벌 5종입니다. 탐 높이, 오픈 하이햇, 라이드·크래시는 원곡을 듣고 구분해 주세요.")
        if not events:
            warnings.append("타격을 찾지 못했습니다. 분리된 드럼을 들어 보고 민감도를 높여 주세요.")
        result = {
            "schemaVersion": 1, "duration": duration, "bpm": tempo, "beatTimes": beats,
            "events": events, "warnings": warnings,
            "models": {"separation": "input-drums" if input_is_drums else "htdemucs_ft/drums (f7e0c4bc)",
                       "transcription": "ADTOF Frame_RNN", "classes": list(CLASSES), "fps": FPS},
        }
        export_performance_midi(events, directory / "performance.mid", bpm or tempo or 120)
        check_cancel(cancel)
        progress(99, "분리된 드럼과 원래 타격 시점을 저장했어요")
        return result


def pick_events(prediction: np.ndarray, stem: Path, duration: float, sensitivity: int) -> list[dict]:
    from adtof_pytorch.post_processing import PeakPicker

    thresholds = (BASE_THRESHOLDS * (1 - (sensitivity - 62) * 0.012)).clip(0.08, 0.6)
    picked = PeakPicker(thresholds=thresholds, fps=FPS).pick(prediction, labels=MIDI)[0]
    result = []
    with sf.SoundFile(stem) as audio:
        for index, (instrument, pitch) in enumerate(zip(CLASSES, MIDI)):
            for time in picked[pitch]:
                if not 0 <= time < duration:
                    continue
                frame = min(len(prediction) - 1, round(time * FPS))
                audio.seek(min(len(audio), round(time * SR)))
                wave = audio.read(round(0.03 * SR), dtype="float32", always_2d=True)
                energy = float(np.sqrt(np.mean(wave ** 2))) if wave.size else 0.0
                result.append({"time": round(time, 5), "instrument": instrument, "midi": pitch,
                               "confidence": round(float(prediction[frame, index]), 4), "energy": energy})
    # Dynamics are signal-derived, not model confidence. These are approximate
    # relative velocities: another simultaneous drum may affect the stem RMS.
    for instrument in CLASSES:
        hits = [e for e in result if e["instrument"] == instrument]
        reference = max(1e-6, float(np.percentile([e["energy"] for e in hits], 95))) if hits else 1
        for event in hits:
            event["velocity"] = int(np.clip(100 * (event.pop("energy") / reference) ** 0.45, 20, 120))
    return sorted(result, key=lambda event: (event["time"], event["instrument"]))


def track_beats(stem: Path, duration: float, bpm: float | None) -> tuple:
    import librosa

    if bpm is not None:
        return float(bpm), np.arange(0, duration + 60 / bpm, 60 / bpm).round(6).tolist(), []
    audio, _ = librosa.load(stem, sr=22050, mono=True)
    if np.max(np.abs(audio)) < 1e-6:
        return None, [], ["무음이라 BPM을 추정하지 못했습니다. BPM과 첫 박자를 직접 설정해 주세요."]
    tempo, beat_frames = librosa.beat.beat_track(y=audio, sr=22050, hop_length=220, trim=False)
    tempo = float(np.asarray(tempo).reshape(-1)[0])
    if not 45 <= tempo <= 260 or len(beat_frames) < 3:
        return None, [], ["박자를 안정적으로 찾지 못했습니다. BPM과 첫 박자를 직접 설정해 주세요."]
    beats = librosa.frames_to_time(beat_frames, sr=22050, hop_length=220).astype(float)
    intervals = np.diff(beats)
    warnings = ["BPM의 절반·두 배 해석과 마디 첫 박자는 자동으로 확정할 수 없습니다. 재생하며 BPM과 첫 박자를 확인해 주세요."]
    if np.std(intervals) / max(1e-6, np.mean(intervals)) > 0.08:
        warnings.append("박자 간격에 변화가 있습니다. 악보 재생은 검출된 박자 지도를 따르며, 원래 타격 시점은 연주 MIDI에 보존됩니다.")
    return round(tempo, 2), beats.round(6).tolist(), warnings


def export_performance_midi(events: list[dict], path: Path, bpm: float):
    import pretty_midi

    midi = pretty_midi.PrettyMIDI(initial_tempo=bpm, resolution=960)
    drums = pretty_midi.Instrument(program=0, is_drum=True)
    for event in events:
        drums.notes.append(pretty_midi.Note(event["velocity"], event["midi"],
                                           event["time"], event["time"] + 0.035))
    midi.instruments.append(drums)
    midi.write(str(path))
