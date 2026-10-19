"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import styles from "./stash-example.module.css";

const StashScene = dynamic(() => import("./stash-scene"), {
  ssr: false,
  loading: () => (
    <div className={`${styles.scene} ${styles.loading}`} role="status">
      Loading stash…
    </div>
  ),
});

export default function StashExample() {
  const example = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const element = example.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setActive(true);
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={example} className={styles.example}>
      {active ? (
        <StashScene />
      ) : (
        <div className={styles.poster}>
          <Image
            src="/images/shd/stash.png"
            alt="The original SHD storage case in a dark 3D scene with an orange dotted floor."
            width={1317}
            height={825}
            sizes="(max-width: 800px) 94vw, 1100px"
          />
        </div>
      )}
    </div>
  );
}
