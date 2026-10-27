'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useT } from '@/i18n/i18n-context'
import { meditationsAr } from '@/i18n/meditations'

const speeds = [0.75, 1, 1.25, 1.5]

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function MeditationPlayer({ src }: { src: string }) {
  const { t } = useT()
  const copy = t.meditations ?? meditationsAr
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [rate, setRate] = useState(1)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setCurrent(audio.currentTime)
    const onLoaded = () => setDuration(audio.duration || 0)
    const onEnd = () => setPlaying(false)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('ended', onEnd)
    }
  }, [])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => setFailed(true))
    }
  }

  function seek(event: ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    const value = Number(event.target.value)
    if (!audio) return
    audio.currentTime = value
    setCurrent(value)
  }

  function changeVolume(event: ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    const value = Number(event.target.value)
    setVolume(value)
    setMuted(value === 0)
    if (audio) {
      audio.volume = value
      audio.muted = value === 0
    }
  }

  function toggleMute() {
    const audio = audioRef.current
    const next = !muted
    setMuted(next)
    if (audio) audio.muted = next
  }

  function changeRate(value: number) {
    setRate(value)
    const audio = audioRef.current
    if (audio) audio.playbackRate = value
  }

  return (
    <div className="rounded-xl border border-[#617A55]/15 bg-[#D6E2B6]/25 p-5 sm:p-6">
      <audio
        ref={audioRef}
        src={src}
        aria-label={copy.audio}
        controlsList="nodownload"
        preload="metadata"
        onError={() => setFailed(true)}
      />
      {failed ? (
        <p role="alert" className="text-sm leading-7">
          {copy.audioError}
        </p>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? copy.pause : copy.play}
              className="grid size-12 shrink-0 place-items-center rounded-full bg-[#617A55] text-[#F7F6F0] transition hover:bg-[#617A55]/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]"
            >
              {playing ? <Pause aria-hidden="true" className="size-5" /> : <Play aria-hidden="true" className="size-5 translate-x-0.5" />}
            </button>
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={current}
                onChange={seek}
                aria-label={copy.seek}
                className="w-full accent-[#617A55]"
              />
              <div className="mt-1 flex justify-between text-xs text-[#617A55]/80" dir="ltr">
                <span>{formatTime(current)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted || volume === 0 ? copy.unmute : copy.mute}
                className="text-[#617A55] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55]"
              >
                {muted || volume === 0 ? <VolumeX aria-hidden="true" className="size-4" /> : <Volume2 aria-hidden="true" className="size-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={changeVolume}
                aria-label={copy.volume}
                className="w-20 accent-[#617A55]"
              />
            </div>

            <div className="flex items-center gap-1" role="group" aria-label={copy.playbackSpeed}>
              {speeds.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => changeRate(speed)}
                  aria-pressed={rate === speed}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#617A55] ${
                    rate === speed ? 'bg-[#617A55] text-[#F7F6F0]' : 'text-[#617A55] hover:bg-[#617A55]/10'
                  }`}
                >
                  {speed}×
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
