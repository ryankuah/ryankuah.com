"use client";

import { useEffect, useRef, useState } from "react";
import {
  PitchCarGlyph,
  RollCarGlyph,
  SpringGlyph,
  SteeringWheelIcon,
} from "./glyphs";
import styles from "./forza-showcase.module.css";

const green = "#63da97";
const amber = "#f3d09b";
const blue = "#59a7ff";
const coral = "#e46645";
const wave = (t: number, phase = 0) => (Math.sin(t + phase) + 1) / 2;

type Balance = "Understeer" | "Neutral" | "Oversteer";
const explanations: Record<Balance, string> = {
  Understeer:
    "The front tires run at a larger slip angle than the rear. The car pushes wide: adding steering produces less rotation than the driver wants.",
  Neutral:
    "Front and rear slip angles stay close together. The car follows the corner with a more even balance between the two axles.",
  Oversteer:
    "The rear tires run at a larger slip angle than the front. The rear steps out and the car rotates more than intended, often requiring countersteer.",
};

export function ForzaShowcase() {
  const [paused, setPaused] = useState(false);
  const [time, setTime] = useState(0);
  const [balance, setBalance] = useState<Balance>("Understeer");
  const root = useRef<HTMLDivElement>(null);
  const elapsed = useRef(0);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    let frame = 0;
    let previous = 0;
    let lastPaint = 0;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    if (root.current) observer.observe(root.current);
    function tick(now: number) {
      const dt = previous ? Math.min(now - previous, 100) : 0;
      previous = now;
      if (!paused && !motion.matches && visible && !document.hidden) {
        elapsed.current += dt / 1000;
        if (now - lastPaint > 40) {
          setTime(elapsed.current);
          lastPaint = now;
        }
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [paused]);

  const steer = Math.sin(time * 0.65) * 38;
  const throttle = 18 + wave(time * 0.8) * 73;
  const brake = Math.max(0, Math.sin(time * 0.8 + Math.PI)) * 68;
  const rpm = Math.round(2200 + wave(time * 0.8) * 4600);
  const yaw = Math.sin(time * 0.65) * 24;
  const progress = (time % 12) / 12;

  return (
    <div className={styles.showcase} ref={root}>
      <div className={styles.toolbar}>
        <span>
          <i /> Component demos · Sample data
        </span>
        <button
          type="button"
          onClick={() => setPaused(!paused)}
          aria-pressed={paused}
        >
          {paused ? "Resume motion" : "Pause motion"}
        </button>
      </div>

      <section className={styles.section} aria-label="Driver inputs and engine">
        <div className={styles.sectionHeading}>
          <span>01</span>
          <h3>Driver inputs & engine</h3>
        </div>
        <div className={styles.inputs}>
          <div className={styles.steering}>
            <div className={styles.wheel}>
              <SteeringWheelIcon rotation={steer * 1.35} />
            </div>
            <strong>
              {steer > 0 ? "+" : ""}
              {steer.toFixed(0)}%
            </strong>
            <span>Steering</span>
          </div>
          <div className={styles.pedals}>
            <Meter label="Throttle" value={throttle} color={green} />
            <Meter label="Brake" value={brake} color={coral} />
          </div>
          <div className={styles.engine}>
            <div className={styles.rpmReadout}>
              <span>Engine</span>
              <strong>
                {rpm.toLocaleString("en-US")} <small>rpm</small>
              </strong>
            </div>
            <div
              className={styles.rpmTrack}
              aria-label={`Engine speed ${rpm} rpm`}
              role="img"
            >
              {Array.from({ length: 17 }, (_, index) => (
                <i key={index} style={{ left: `${index * 6.25}%` }} />
              ))}
              <b style={{ left: `${rpm / 80}%` }} />
            </div>
            <div className={styles.scale}>
              <span>0</span>
              <span>4,000</span>
              <span>8,000</span>
            </div>
            <div className={styles.powertrain}>
              <div>
                <span>Power</span>
                <strong>
                  {Math.round(70 + throttle * 3.4)} <small>hp</small>
                </strong>
              </div>
              <div>
                <span>Torque</span>
                <strong>
                  {Math.round(140 + throttle * 4.1)} <small>Nm</small>
                </strong>
              </div>
              <div>
                <span>Boost</span>
                <strong>
                  {(throttle * 0.18).toFixed(1)} <small>psi</small>
                </strong>
              </div>
            </div>
          </div>
        </div>
        <p>
          Steering direction, pedal pressure and engine output make the driver’s
          inputs visible. In a recorded run, these help explain what happened
          just before the car’s behaviour changed.
        </p>
      </section>

      <section
        className={styles.section}
        aria-label="Suspension and vehicle motion"
      >
        <div className={styles.sectionHeading}>
          <span>02</span>
          <h3>Suspension & vehicle motion</h3>
        </div>
        <div className={styles.chassis}>
          <div className={styles.suspension}>
            <h4>Suspension travel</h4>
            <div className={styles.springs}>
              {["FL", "FR", "RL", "RR"].map((label, index) => {
                const compression = 0.25 + wave(time * 1.5, index * 1.7) * 0.55;
                return (
                  <div key={label}>
                    <span>{label}</span>
                    <SpringGlyph
                      compression={compression}
                      color={compression > 0.7 ? amber : green}
                      label={label}
                    />
                    <strong>
                      {Math.round(compression * 100)}
                      <small>%</small>
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={styles.attitude}>
            <h4>Chassis attitude</h4>
            <svg
              viewBox="0 0 330 150"
              role="img"
              aria-label="Animated car yaw, roll and pitch"
            >
              {[55, 165, 275].map((x) => (
                <g key={x}>
                  <circle
                    cx={x}
                    cy="70"
                    r="43"
                    fill="#101312"
                    stroke="#ffffff12"
                  />
                  <path
                    d={`M${x - 43} 70 H${x + 43} M${x} 27 V113`}
                    stroke="#ffffff14"
                  />
                </g>
              ))}
              <g transform={`translate(55 70) rotate(${yaw})`}>
                <TopCar />
              </g>
              <g transform={`translate(165 70) rotate(${Math.sin(time) * 10})`}>
                <RollCarGlyph />
              </g>
              <g
                transform={`translate(275 70) rotate(${Math.sin(time * 0.8) * 9})`}
              >
                <PitchCarGlyph />
              </g>
              <text x="55" y="13">
                Yaw
              </text>
              <text x="165" y="13">
                Roll
              </text>
              <text x="275" y="13">
                Pitch
              </text>
              <text x="55" y="140">
                {(Math.cos(time * 0.65) * 15.6).toFixed(1)}°/s
              </text>
              <text x="165" y="140">
                {(Math.sin(time) * 10).toFixed(1)}°
              </text>
              <text x="275" y="140">
                {(Math.sin(time * 0.8) * 9).toFixed(1)}°
              </text>
            </svg>
          </div>
        </div>
        <p>
          The springs show compression at each wheel. Yaw is rotation into a
          turn; roll is the body leaning sideways; pitch is the nose rising or
          dipping. Together, they make changes in the car’s attitude easier to
          read.
        </p>
      </section>

      <section
        className={styles.section}
        aria-label="Understeer and oversteer analysis"
      >
        <div className={styles.sectionHeading}>
          <span>03</span>
          <h3>Understeer & oversteer</h3>
        </div>
        <p>
          Compare the front and rear tires through corner entry, mid-corner and
          exit. These examples show the patterns the analysis helps you
          investigate.
        </p>
        <div
          className={styles.balanceControls}
          role="group"
          aria-label="Handling example"
        >
          {(["Understeer", "Neutral", "Oversteer"] as const).map((option) => (
            <button
              type="button"
              key={option}
              aria-pressed={balance === option}
              onClick={() => setBalance(option)}
            >
              {option}
            </button>
          ))}
        </div>
        <div className={styles.analysis}>
          <div className={styles.corner}>
            <svg
              viewBox="0 0 240 185"
              role="img"
              aria-label={`${balance} cornering path illustration`}
            >
              <path
                d="M40 160 V100 Q40 40 105 40 H210"
                fill="none"
                stroke="#ffffff09"
                strokeWidth="42"
              />
              <path
                d="M40 160 V100 Q40 40 105 40 H210"
                fill="none"
                stroke="#6a7770"
                strokeWidth="2"
                strokeDasharray="4 6"
              />
              <path
                d={
                  balance === "Understeer"
                    ? "M40 160 V100 Q40 8 115 10 H210"
                    : balance === "Oversteer"
                      ? "M40 160 V105 Q45 64 96 62 Q133 58 116 29"
                      : "M40 160 V100 Q40 40 105 40 H210"
                }
                fill="none"
                stroke={amber}
                strokeWidth="3"
                strokeLinecap="round"
              />
              <g
                transform={`translate(${balance === "Understeer" ? 76 : 83} ${balance === "Understeer" ? 19 : balance === "Oversteer" ? 66 : 47}) rotate(${balance === "Oversteer" ? 110 : balance === "Understeer" ? 44 : 64}) scale(.65)`}
              >
                <TopCar />
              </g>
              <text x="58" y="178" textAnchor="start">
                Entry
              </text>
              <text x="198" y="76" textAnchor="end">
                Exit
              </text>
            </svg>
            <div className={styles.legend}>
              <span>
                <i style={{ background: "#6a7770" }} />
                Intended line
              </span>
              <span>
                <i style={{ background: amber }} />
                Example path
              </span>
            </div>
          </div>
          <div className={styles.trace}>
            <h4>
              Axle slip angle <span>Illustrative · relative scale</span>
            </h4>
            <SlipChart balance={balance} progress={progress} />
            <div className={styles.legend}>
              <span>
                <i style={{ background: blue }} />
                Front axle
              </span>
              <span>
                <i style={{ background: coral }} />
                Rear axle
              </span>
            </div>
          </div>
        </div>
        <div className={styles.explanation} aria-live="polite">
          <strong>{balance}</strong>
          <p>{explanations[balance]}</p>
        </div>
        <div className={styles.phases}>
          <div>
            <h4>Entry</h4>
            <p>
              Compare braking and steering with the initial rise in front slip.
            </p>
          </div>
          <div>
            <h4>Mid-corner</h4>
            <p>Look at axle balance alongside yaw rate and lateral load.</p>
          </div>
          <div>
            <h4>Exit</h4>
            <p>Check whether rear slip increases as throttle is applied.</p>
          </div>
        </div>
        <p className={styles.note}>
          Slip alone is not a tuning diagnosis. The app puts inputs, vehicle
          response, tire usage and suspension travel alongside one another so a
          run can be reviewed in context. Automatic tuning advice is still
          exploratory.
        </p>
      </section>
    </div>
  );
}

function Meter({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={styles.meter}>
      <div>
        <span>{label}</span>
        <strong>{Math.round(value)}%</strong>
      </div>
      <div className={styles.meterTrack}>
        <i style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function TopCar() {
  return (
    <g>
      <rect
        x="-16"
        y="-29"
        width="32"
        height="58"
        rx="10"
        fill="#293c35"
        stroke={amber}
        strokeWidth="1.7"
      />
      <path
        d="M-11 -13 Q0 -19 11 -13 L9 5 H-9 Z"
        fill="#101b16"
        stroke="#ffffff40"
      />
      <path
        d="M-9 13 H9 M-11 -24 H-5 M5 -24 H11"
        stroke={amber}
        strokeWidth="2"
      />
    </g>
  );
}

function SlipChart({
  balance,
  progress,
}: {
  balance: Balance;
  progress: number;
}) {
  function point(p: number, axle: "front" | "rear") {
    const envelope = Math.sin(p * Math.PI);
    const dominant =
      balance === "Understeer"
        ? axle === "front"
        : balance === "Oversteer"
          ? axle === "rear"
          : false;
    const value =
      0.12 +
      envelope * (dominant ? 0.7 : 0.37) +
      Math.sin(p * 19 + (axle === "front" ? 0 : 0.7)) * 0.025;
    return { x: 20 + p * 320, y: 139 - value * 118 };
  }
  return (
    <svg
      viewBox="0 0 360 185"
      role="img"
      aria-label={`${balance}: ${balance === "Neutral" ? "similar front and rear slip" : balance === "Understeer" ? "front slip greater than rear" : "rear slip greater than front"} through the corner`}
    >
      {[40, 73, 106, 139].map((y) => (
        <path key={y} d={`M20 ${y} H340`} stroke="#ffffff0d" />
      ))}
      {[127, 233].map((x) => (
        <path
          key={x}
          d={`M${x} 20 V145`}
          stroke="#ffffff20"
          strokeDasharray="3 5"
        />
      ))}
      <text x="72" y="172">
        Entry
      </text>
      <text x="180" y="172">
        Mid-corner
      </text>
      <text x="288" y="172">
        Exit
      </text>
      {(["front", "rear"] as const).map((axle) => {
        const current = point(progress, axle);
        return (
          <g key={axle}>
            <polyline
              points={Array.from({ length: 65 }, (_, i) => {
                const p = point(i / 64, axle);
                return `${p.x},${p.y}`;
              }).join(" ")}
              fill="none"
              stroke={axle === "front" ? blue : coral}
              strokeWidth="2.5"
            />
            <circle
              cx={current.x}
              cy={current.y}
              r="4"
              fill={axle === "front" ? blue : coral}
              stroke="#171717"
              strokeWidth="2"
            />
          </g>
        );
      })}
      <path d={`M${20 + progress * 320} 20 V145`} stroke="#ffffff40" />
    </svg>
  );
}
