import { observable, reaction } from "mobx";
import * as mobx from "mobx";
import { AudioStore } from "./Player";
import { arrayBufferToBase64 } from "src/util/misc";

export interface AudioState {
  audio: HTMLAudioElement;
  analyzer: AnalyserNode;
  audioCtx: AudioContext;
  audioId: string;
}

export interface AudioSink {
  clearAudio(): void;
  current: AudioState | undefined;
}

// consumer
export function AudioSink(player: AudioStore): AudioSink {
  const self = observable(
    {
      current: undefined as undefined | AudioState,
      setAudio(audioState: AudioState) {
        self.current = audioState;
      },
      clearAudio() {
        self.current?.audio.pause();
        self.current?.audioCtx.suspend();
        self.current?.audioCtx.close();
        self.current = undefined;
      },
    },
    {
      current: mobx.observable.ref,
      setAudio: mobx.action,
      clearAudio: mobx.action,
    }
  );

  reaction(
    () =>
      player.activeText && [
        player.activeText.audio.id,
        player.activeText.position,
        player.activeText.isPlaying,
        !!player.activeText.audio.tracks[player.activeText.position]?.audio,
      ],
    (inputs) => {
      if (!player.activeText) {
        self.clearAudio();
      } else {
        const position = player.activeText.position;
        const activeAudio = player.activeText.audio;
        const newAudioId = activeAudio.id + "-" + position;
        const track = activeAudio.tracks[position];

        if (!track?.audio) {
          return; // wait for it
        } else if (newAudioId !== self.current?.audioId) {
          self.clearAudio();
          const base64 = arrayBufferToBase64(track.audio);

          const audio = new Audio("data:audio/mpeg;base64," + base64);
          audio.preload = "auto";
          audio.load();
          audio.id = newAudioId;
          const state = AudioMonitor(newAudioId, audio);
          self.setAudio(state);
          const onEnded = () => {
            self.clearAudio();
            player.activeText?.goToPosition(position + 1);
            self.current?.audio.removeEventListener("ended", onEnded);
          };
          audio.addEventListener("ended", onEnded);
        }

        if (player.activeText.isPlaying) {
          const currentAudio = self.current?.audio;
          if (currentAudio) {
            waitForEnoughData(currentAudio)
              // wait for it
              .then(() => {
                console.log("currentAudio.readyState", currentAudio.readyState);
                currentAudio.play();
              });
          }
        } else {
          self.current?.audio.pause();
        }
      }
    },
    {
      fireImmediately: true,
      equals: mobx.comparer.shallow,
    }
  );
  return self;
}

async function waitForEnoughData(audio: HTMLAudioElement): Promise<void> {
  while (audio.readyState < audio.HAVE_FUTURE_DATA) {
    console.log("not enough data... waiting", audio.readyState);
    await new Promise((res, rej) => {
      audio.addEventListener("canplay", res, { once: true });
    });
  }
}

function AudioMonitor(audioId: string, audio: HTMLAudioElement): AudioState {
  // Create audio context and analyzer
  const audioCtx = new AudioContext();
  const analyzer = audioCtx.createAnalyser();
  const source = audioCtx.createMediaElementSource(audio);
  source.connect(analyzer);
  analyzer.connect(audioCtx.destination);

  // Analyzer settings. Magic numbers that make the visualizer icon look good
  analyzer.fftSize = 512; // controls the resolution of the spectrum
  analyzer.minDecibels = -100; // notes quieter than this are now shown
  analyzer.maxDecibels = -30; // notes higher than this just show the max
  analyzer.smoothingTimeConstant = 0.6; // how rapidly to decay measurement for the value. (Maybe smoothing for growth too?)
  return { audioId, analyzer, audio, audioCtx };
}