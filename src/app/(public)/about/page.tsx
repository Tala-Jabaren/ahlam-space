import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Heart, Leaf, Quote, Wind } from 'lucide-react'
import WordRevealText from '@/components/home/word-reveal-text'
import { getT } from '@/i18n/get-t'
import { getLocale } from '@/i18n/get-locale'
import { getDictionary } from '@/i18n/dictionaries'
import { pageMetadata } from '@/lib/seo'
import AboutServiceIcon from './about-service-icon'
import styles from './about.module.css'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = getDictionary(locale)
  return pageMetadata({ ...t.seo.about, path: '/about', locale })
}

const offerRoutes = ['/private-sessions', '/courses', '/classes']
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
            <Image src="/images/aboutpic2.png" alt={t.about.imageAlt} fill priority sizes="(min-width: 1200px) 340px, (min-width: 768px) 280px, 320px" />
          </div>
        </div>
      </div>
      <div className={styles.heroMeta}>
        <p>{copy.role}</p>
        <p className={styles.location}><span>{copy.place}</span><span>{copy.practices}</span></p>
        <div><p>{t.about.subheading}</p><Link href="/contact" className={styles.textLink}>{copy.contact}<ArrowUpRight aria-hidden="true" size={17} /></Link></div>
      </div>
    </section>

    <div className={styles.marquee} tabIndex={0} role="region" aria-label={copy.marqueeLabel}>
      <div className={styles.marqueeTrack}>
        {[false, true].map((duplicate) => <p key={String(duplicate)} className={styles.marqueeCopy} aria-hidden={duplicate || undefined}>
          {copy.words.map(word => <span key={word}>{word}<i aria-hidden="true">•</i></span>)}
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
          <Image src="/images/SunlitSageMedittionDesk.png" alt={copy.spaceImageAlt} fill sizes="(min-width: 1200px) 520px, (min-width: 768px) 45vw, calc(100vw - 40px)" />
        </div>
        <div className={styles.floatingNote}><h3>{copy.spaceTitle}</h3><p>{copy.spaceText}</p></div>
      </div>
    </section>

    <section id="my-story" aria-labelledby="story-title" className={`${styles.container} ${styles.section} ${styles.story}`}>
      <div className={styles.storyMarker}>
        <Leaf aria-hidden="true" size={40} strokeWidth={1} />
        <div><p className={styles.eyebrow}>{copy.storyEyebrow}</p><h2 id="story-title" className={styles.heading}>{t.about.myStoryHeading}</h2></div>
      </div>
      <div className={styles.storyCopy}>
        <h3>{t.about.heading}</h3>
        {[t.about.paragraph, t.about.myStoryParagraph1, t.about.myStoryParagraph2].map(paragraph => <WordRevealText key={paragraph} text={paragraph} as="p" className={styles.storyParagraph} fullColor="#25311f" dimBackground="#617A55" />)}
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

    <section id="movement-quote" aria-label={`${t.about.quoteLine1} ${t.about.quoteLine2}`} className={styles.quoteBand}>
      <div className={styles.breath} aria-hidden="true" />
      <figure className={`${styles.container} ${styles.quote}`}>
        <Quote aria-hidden="true" size={36} strokeWidth={1.2} />
        <blockquote>
          <WordRevealText text={t.about.quoteLine1} className={styles.quoteLine} fullColor="#25311f" dimBackground="#617A55" />
          <WordRevealText text={t.about.quoteLine2} className={styles.quoteLine} fullColor="#25311f" dimBackground="#617A55" />
        </blockquote>
        <figcaption>{t.about.quoteAuthor}</figcaption>
      </figure>
    </section>

    <section id="what-i-offer" aria-labelledby="offers-title" className={`${styles.container} ${styles.section}`}>
      <h2 id="offers-title" className={`${styles.heading} ${styles.reveal}`}>{t.about.offerHeading}</h2>
      <ul className={`${styles.offers} ${styles.stagger}`} tabIndex={0} aria-label={copy.offersLabel}>
        {t.about.services.map((service, index) => <li key={service.title} className={`${styles.offerShell} ${styles.reveal}`}>
          <Link href={offerRoutes[index]} className={styles.offerCard}>
            <span className={styles.offerIcon}><AboutServiceIcon index={index} /></span><h3>{service.title}</h3><p>{service.description}</p>
            <ArrowUpRight className={styles.offerArrow} aria-hidden="true" size={24} strokeWidth={1.5} />
          </Link>
        </li>)}
      </ul>
    </section>

    <section id="start-your-journey" aria-labelledby="closing-title" className={`${styles.container} ${styles.section} ${styles.closing}`}>
      <div className={`${styles.closingPanel} ${styles.reveal}`}>
        <h2 id="closing-title">{t.about.finalHeading}</h2><p>{t.about.finalParagraph}</p>
        <div className={styles.actions}>
          <Link href="/classes" className={styles.primaryAction}>{t.about.ctaExplore}<ArrowUpRight size={18} aria-hidden="true" /></Link>
          <Link href="/contact">{copy.contact}</Link>
        </div>
      </div>
    </section>
  </div>
}
