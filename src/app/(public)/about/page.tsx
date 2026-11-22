import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { WHATSAPP_URL } from '@/content/site-contact'
import { ArrowUpRight, Heart, Leaf, Wind } from 'lucide-react'
import WordRevealText from '@/components/home/word-reveal-text'
import { getT } from '@/i18n/get-t'
import { getLocale } from '@/i18n/get-locale'
import { getDictionary } from '@/i18n/dictionaries'
import { pageMetadata } from '@/lib/seo'
import styles from './about.module.css'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = getDictionary(locale)
  return pageMetadata({ ...t.seo.about, path: '/about', locale })
}

const valueIcons = [Wind, Heart, Leaf]

export default async function AboutPage() {
  const { t, dir, locale } = await getT()
  const copy = t.about.editorial
  return <div className={styles.page} dir={dir} lang={locale}>
    <section id="about-hero" aria-labelledby="about-title" className={`${styles.container} ${styles.hero}`}>
      <p className={styles.eyebrow}>{copy.eyebrow}</p>
      <div className={styles.heroStage}>
        <h1 id="about-title" className={styles.heroTitle} aria-label={copy.heroTitle}>
          <span className={styles.heroWord} aria-hidden="true"><span className={styles.heroStart}>{copy.heroStart}</span></span>
          <span className={styles.heroWord} aria-hidden="true"><span className={styles.heroEnd}>{copy.heroEnd}</span></span>
        </h1>
        <div className={styles.portraitDrift}>
          <div className={styles.portrait}>
            <Image src="/images/mainaboutpic.png" alt={t.about.imageAlt} fill priority sizes="(min-width: 1200px) 520px, (min-width: 1024px) 44vw, (min-width: 768px) 480px, (min-width: 400px) 360px, calc(100vw - 40px)" />
          </div>
        </div>
      </div>
      <div className={styles.heroMeta}>
        <div className={styles.heroIntro}>
          <span className={styles.heroEmblem} aria-hidden="true"><Leaf size={25} strokeWidth={1.4} /></span>
          <p>{copy.role}</p>
        </div>
        <a href={WHATSAPP_URL} className={styles.heroContact}>{copy.contact}<ArrowUpRight aria-hidden="true" size={18} /></a>
      </div>
    </section>

    <div className={styles.marquee} tabIndex={0} role="region" aria-label={copy.marqueeLabel}>
      <div className={styles.marqueeTrack}>
        {[false, true].map((duplicate) => <p key={String(duplicate)} className={styles.marqueeCopy} aria-hidden={duplicate || undefined}>
          {Array.from({ length: 4 }, (_, repetition) => copy.words.map(word => <span key={`${repetition}-${word}`} className={repetition > 0 ? styles.marqueeRepeat : undefined} aria-hidden={repetition > 0 || undefined}>{word}<i aria-hidden="true">•</i></span>))}
        </p>)}
      </div>
    </div>

    <section id="my-approach" aria-labelledby="approach-title" className={`${styles.container} ${styles.section} ${styles.approach}`}>
      <div>
        <p className={styles.eyebrow}>{copy.approachEyebrow}</p>
        <h2 id="approach-title" className={`${styles.heading} ${styles.reveal}`}>{copy.approachLine1}<span className={styles.muted}>{copy.approachLine2}</span></h2>
        <p className={styles.body}>{copy.approachParagraph}</p>
        <div className={`${styles.approachItems} ${styles.stagger}`}>
          {copy.approachItems.map((item, index) => {
            const Icon = index === 0 ? Heart : Wind
            return <div key={item.title} className={`${styles.approachItem} ${styles.reveal}`}>
              <Icon aria-hidden="true" size={24} strokeWidth={1.5} /><div><h3>{item.title}</h3><p>{item.text}</p></div>
            </div>
          })}
        </div>
      </div>
      <div className={styles.approachPhoto}>
        <div className={`${styles.spacePhoto} ${styles.reveal}`}>
          <Image src="/images/secondabourpage.png" alt={copy.spaceImageAlt} fill sizes="(min-width: 1200px) 520px, (min-width: 768px) 45vw, calc(100vw - 40px)" />
        </div>
        <div className={styles.floatingNote}><h3>{copy.spaceTitle}</h3><p>{copy.spaceText}</p></div>
      </div>
    </section>

    <section id="my-story" aria-labelledby="story-title" className={`${styles.container} ${styles.section} ${styles.story}`}>
      <div className={styles.storyMarker}>
        <div className={styles.storyImage}>
          <Image
            src="/images/story-waterfall.png"
            alt=""
            fill
            sizes="(min-width: 1240px) 420px, (min-width: 768px) 36vw, calc(100vw - 40px)"
          />
        </div>
        <Leaf aria-hidden="true" size={40} strokeWidth={1} />
        <div className={styles.storyLabel}><p className={styles.eyebrow}>{copy.storyEyebrow}</p><h2 id="story-title" className={styles.heading}>{t.about.myStoryHeading}</h2></div>
      </div>
      <div className={styles.storyCopy}>
        <h3>{t.about.heading}</h3>
        {[t.about.paragraph, t.about.myStoryParagraph1].map(paragraph => <WordRevealText key={paragraph} text={paragraph} as="p" className={styles.storyParagraph} fullColor="#25311f" dimBackground="#617A55" />)}
      </div>
    </section>

    <section id="class-feeling" aria-labelledby="class-title" className={`${styles.container} ${styles.section}`}>
      <h2 id="class-title" className={`${styles.heading} ${styles.reveal}`}>{copy.classHeading}</h2>
      <ol className={styles.steps}>
        {copy.steps.map((step, index) => <li key={step.title} className={styles.step}>
          <span className={styles.stepNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <div><h3>{step.title}</h3><p>{step.text}</p></div>
        </li>)}
      </ol>
    </section>

    <section id="my-values" aria-labelledby="values-title" className={`${styles.container} ${styles.section}`}>
      <h2 id="values-title" className={`${styles.heading} ${styles.reveal}`}>{copy.valuesHeading}</h2>
      <div className={`${styles.values} ${styles.stagger}`}>
        {copy.values.map((value, index) => {
          const Icon = valueIcons[index]
          return <article key={value.title} className={`${styles.value} ${styles.reveal}`}><Icon aria-hidden="true" size={26} strokeWidth={1.5} /><h3>{value.title}</h3><p>{value.text}</p></article>
        })}
      </div>
    </section>

    <section id="start-your-journey" aria-labelledby="closing-title" className={`${styles.container} ${styles.section} ${styles.closing}`}>
      <div className={`${styles.closingPanel} ${styles.reveal}`}>
        <h2 id="closing-title">{t.about.finalHeading}</h2><p>{t.about.finalParagraph}</p>
        <div className={styles.actions}>
          <Link href="/classes" className={styles.primaryAction}>{t.about.ctaExplore}<ArrowUpRight size={18} aria-hidden="true" /></Link>
          <a href={WHATSAPP_URL}>{copy.contact}</a>
        </div>
      </div>
    </section>
  </div>
}
