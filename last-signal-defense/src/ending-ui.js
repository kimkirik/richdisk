import { EndingSequence, campaignSummary } from "./ending.js?v=20260911-flow";
import { STAGES } from "./data.js?v=20260911-flow";
import { paintMap } from "./renderer.js?v=20260911-flow";

export class EndingPresentation {
  constructor(audio, { onResult, onMaps, onReplay }) {
    this.audio = audio;
    this.onResult = onResult;
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)");
    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <dialog id="ending-dialog" class="ending-dialog" aria-labelledby="ending-title" aria-describedby="ending-description">
        <div class="ending-toolbar"><span id="ending-sector"></span><button id="ending-sound" aria-label="엔딩 음악 끄기">♪</button><button id="ending-skip" autofocus>연출 건너뛰기 <span>↗</span></button></div>
        <section class="victory-message"><p>SECTOR SECURED</p><h2 id="ending-title">구역 확보</h2><div class="victory-divider"></div><p id="ending-description">당신이 지켜낸 신호가 다음 구역으로 이어집니다.</p></section>
        <section class="finale-content" hidden>
          <header><p class="ending-eyebrow">LAST SIGNAL / FINAL TRANSMISSION</p><h2>마지막 신호, 복구 완료</h2><p class="network-counter">통신망 연결 <strong id="ending-connections">00</strong><span> / 20</span></p></header>
          <div class="ending-network" aria-label="20개 작전 구역의 통신 복구"></div>
          <blockquote class="ending-transmission"><span>수신된 마지막 교신</span>“들립니까?<br>당신의 신호가 모두에게 닿았습니다.”</blockquote>
          <div class="ending-award"><img src="./assets/icons/icon-512.webp" alt="통신 코어와 방패 수호자 훈장" width="72" height="72"><div><span id="ending-award-label">CAMPAIGN COMPLETE</span><h3 id="ending-award-title">마지막 신호의 수호자</h3><p id="ending-record-note"></p></div></div>
          <dl class="ending-summary"><div><dt>확보한 구역</dt><dd id="ending-cleared"></dd></div><div><dt>획득한 별</dt><dd id="ending-total-stars"></dd></div><div><dt>최종전 점수</dt><dd id="ending-final-score"></dd></div></dl>
          <footer class="ending-actions"><button id="ending-maps" class="primary-action">작전 지도로 돌아가기 ↗</button><button id="ending-replay" class="outline-action">마지막 전투 다시 도전</button></footer>
        </section>
      </dialog>`,
    );
    this.dialog = document.querySelector("#ending-dialog");
    this.el = (selector) => this.dialog.querySelector(selector);
    this.el("#ending-skip").onclick = () => this.skip();
    this.el("#ending-sound").onclick = () =>
      document.querySelector("#sound").click();
    this.el("#ending-maps").onclick = () => {
      this.dismiss();
      onMaps();
    };
    this.el("#ending-replay").onclick = () => {
      this.dismiss();
      onReplay();
    };
    this.dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      if (!this.sequence?.finished) this.skip();
    });
    this.reduced.addEventListener("change", () => {
      if (this.reduced.matches && this.sequence && !this.sequence.finished)
        this.skip();
    });
  }
  begin(game, practice, progress, storageAvailable, complete = false) {
    this.game = game;
    this.practice = practice;
    this.sequence = new EndingSequence(
      game.stage.id === 20,
      this.reduced.matches,
    );
    this.lastState = null;
    this.lastConnected = -1;
    this.el("#ending-sector").textContent =
      `SECTOR ${String(game.stage.id).padStart(2, "0")} / 20`;
    this.el("#ending-description").textContent =
      game.stage.id === 20
        ? "마지막 방어선 확보. 모든 구역으로 신호를 전송합니다."
        : "당신이 지켜낸 신호가 다음 구역으로 이어집니다.";
    if (this.sequence.finale) this.prepareFinale(progress, storageAvailable);
    if (complete) this.sequence.skip();
    this.render();
    if (!this.dialog.open) this.dialog.showModal();
    if (!complete) this.audio.playVictory();
    else this.el("#ending-maps").focus();
  }
  prepareFinale(progress, storageAvailable) {
    const network = this.el(".ending-network");
    if (!network.children.length) {
      network.innerHTML = STAGES.map(
        (stage) =>
          `<div class="ending-node" title="${stage.name}"><canvas width="160" height="90" aria-hidden="true"></canvas><span>${String(stage.id).padStart(2, "0")}</span></div>`,
      ).join("");
      [...network.children].forEach((node, i) =>
        paintMap(node.querySelector("canvas"), STAGES[i]),
      );
    }
    const summary = campaignSummary(progress);
    const earned = !this.practice && summary.cleared === 20;
    this.el("#ending-award-label").textContent = this.practice
      ? "PRACTICE / ENDING PREVIEW"
      : earned
        ? "CAMPAIGN COMPLETE"
        : "FINAL SECTOR SECURED";
    this.el("#ending-award-title").textContent = this.practice
      ? "수호자 훈장 · 연습 미리보기"
      : earned
        ? "마지막 신호의 수호자"
        : "마지막 구역의 수호자";
    this.el("#ending-record-note").textContent = this.practice
      ? "연습 플레이는 완주 기록과 훈장을 저장하지 않습니다."
      : !storageAvailable
        ? "브라우저 저장이 제한되어 기록을 저장하지 못했습니다."
        : earned
          ? `첫 완주 ${new Date(progress.completedAt).toLocaleDateString("ko-KR")} · 훈장과 기록 저장 완료`
          : "모든 구역을 확보하면 캠페인 완주 훈장을 받습니다.";
    this.el("#ending-cleared").textContent = `${summary.cleared} / 20`;
    this.el("#ending-total-stars").textContent = `${summary.stars} / 60`;
    this.el("#ending-final-score").textContent =
      this.game.score.toLocaleString();
  }
  advance(seconds, hidden = false) {
    if (!this.sequence || !this.dialog.open) return;
    this.sequence.advance(seconds, hidden);
    this.render();
  }
  render() {
    const sequence = this.sequence;
    if (!sequence) return;
    const state = sequence.state;
    const sound = this.audio.enabled;
    this.el("#ending-sound").textContent = sound ? "♪" : "♪ ×";
    this.el("#ending-sound").setAttribute(
      "aria-label",
      sound ? "엔딩 음악 끄기" : "엔딩 음악 켜기",
    );
    this.el("#ending-sound").setAttribute("aria-pressed", String(sound));
    if (state === "complete" && !sequence.finale) {
      this.dialog.close();
      this.sequence = null;
      this.onResult();
      return;
    }
    if (state !== this.lastState) {
      this.lastState = state;
      this.dialog.dataset.state = state;
      this.el(".victory-message").hidden = state !== "victory";
      this.el(".finale-content").hidden = state === "victory";
      this.el("#ending-skip").hidden = state === "complete";
      this.dialog.setAttribute(
        "aria-labelledby",
        state === "victory" ? "ending-title" : "ending-award-title",
      );
      this.dialog.setAttribute(
        "aria-describedby",
        state === "victory" ? "ending-description" : "ending-record-note",
      );
      if (state === "complete" && this.dialog.open)
        this.el("#ending-maps").focus();
    }
    const connected = sequence.connected;
    if (connected !== this.lastConnected) {
      this.lastConnected = connected;
      this.el("#ending-connections").textContent = String(connected).padStart(
        2,
        "0",
      );
      [...this.el(".ending-network").children].forEach((node, i) =>
        node.classList.toggle("connected", i < connected),
      );
    }
    const local = Math.max(0, sequence.elapsed - 3);
    const done = sequence.finished;
    this.dialog.style.setProperty(
      "--victory-reveal",
      Math.min(1, sequence.elapsed / 0.55),
    );
    this.dialog.style.setProperty(
      "--transmission-reveal",
      done ? 1 : Math.min(1, Math.max(0, (local - 3.7) / 0.8)),
    );
    this.dialog.style.setProperty(
      "--award-reveal",
      done ? 1 : Math.min(1, Math.max(0, (local - 5.3) / 0.8)),
    );
    this.el(".ending-actions").hidden = !done;
  }
  skip() {
    if (!this.sequence) return;
    this.sequence.skip();
    this.audio.stopVictory();
    this.render();
  }
  dismiss() {
    this.sequence = null;
    this.audio.stopVictory();
    if (this.dialog.open) this.dialog.close();
  }
}
