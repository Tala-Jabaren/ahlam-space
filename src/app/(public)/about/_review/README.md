# About release review

About was rebased onto the audited Home ref with **no conflicts**. No Home branch, main branch, database, or SQL file was changed.

Checks passed: npm run lint, npx tsc --noEmit, npm run build. Browser checks: Arabic/English at 390/1280px, one h1, no page overflow, square photo, no header overlap, shortened intro/story, decoded photos, no JavaScript exceptions, reduced motion static.

## Screenshots

Captured with reduced motion to show final readable states. Shared site chrome is retained; only the development overlay was hidden. These files live in a Next.js private folder and add no public route.

| Locale | Phone | Desktop |
|---|---|---|
| Arabic | [390px](ar-390.jpg) | [1280px](ar-1280.jpg) |
| English | [390px](en-390.jpg) | [1280px](en-1280.jpg) |

## Risk list

Audited refs: main `8f91a0af4ae8cf0461c3f061a7d3348f40a5ba4c`, home `6f68afe404f81f6b137494ee1b92b47fe232e3c4`, About code `fed27d008a2ea1c08bbc0ce6bd9c5e2270a976f6`.

| Area | Home → main pending diff | About → home pending diff |
|---|---|---|
| Supabase / SQL | None | None |
| API routes | None | None |
| Auth / session | None | None |
| Payments / bank | None | None |
| Emails / cron | None | None |
| Middleware / proxy | None | None |
| Next config | None | None |
| Packages / lock / new dependencies | None | None |
| Environment files | None | None |
| Image config | None | None |

No pending change in either comparison touches any listed sensitive code/configuration area. No new environment-variable access or image remotePatterns/configuration changes were found. About adds owner-provided image assets and review screenshots; image assets are distinct from image configuration.

## Home diff summary by area

Exact command: `git diff --stat origin/main...origin/feature/home-redesign`.

```text
(empty: 0 changed files, 0 additions, 0 deletions)
```

Home UI/assets: none pending. Shared styling/layout: none pending. Dictionaries/content: none pending. Backend/config/dependencies: none pending. The latest Home head was independently merged by [PR #42](https://github.com/Tala-Jabaren/ahlam-space/pull/42), following #41 and #39. This agent performed no merge and did not modify Home/main.

## Release blockers

1. **Owner verification of statistics is required.** The expected TODO/placeholder state does not match current code: `src/content/site-stats.ts` has 120 individual sessions, 600 group classes and 250 participants with `confirmed: true`; those three are rendered. The events/trips figure 40 is still present with `confirmed: false` and is hidden. There is no TODO in that file. Treat approval of the three published figures as a release blocker, and approve the hidden figure before enabling it. No shared statistics file was edited by this agent.
2. **Every approval-marked About string below needs Ahlam's approval.** The dictionaries mark the entire `about.editorial` block with `TODO owner to confirm`. All 42 leaf keys / 84 language values are listed, including three currently unused keys.
3. **About integration is pending PR #37.** The home branch does not yet contain the About redesign. This release PR is intended to depend on the owner-controlled integration of #37; no merge was performed.
4. **An empty Home comparison cannot open a new GitHub PR.** GitHub rejected the requested draft creation with `No commits between main and feature/home-redesign`. A fresh unmerged Home commit or later owner-controlled integration of #37 is required. The requested draft title is `feat(home): home + about redesign`; its complete body is prepared alongside this report in the local release artifacts.

## Changed-file text scan

Command: `git grep -n -I -i -E 'lorem|TODO|placeholder|example\.com' HEAD -- <changed text files>`. Binary images were excluded. Review artifacts describe this audit and are not production UI.

```text
HEAD:src/i18n/ar.ts:185:    // TODO owner to confirm: all editorial additions below are draft copy.
HEAD:src/i18n/ar.ts:306:      searchPlaceholder: 'ابحثي عن منتج...',
HEAD:src/i18n/ar.ts:373:    messagePlaceholder: 'أخبريني أكثر عن اهتمامك بهذه الجلسة',
HEAD:src/i18n/ar.ts:391:    namePlaceholder: 'الاسم',
HEAD:src/i18n/ar.ts:392:    emailPlaceholder: 'البريد الإلكتروني',
HEAD:src/i18n/ar.ts:393:    messagePlaceholder: 'رسالتك',
HEAD:src/i18n/en.ts:189:    // TODO owner to confirm: all editorial additions below are draft copy.
HEAD:src/i18n/en.ts:310:      searchPlaceholder: 'Search for a product...',
HEAD:src/i18n/en.ts:377:    messagePlaceholder: 'Tell me more about your interest in this session',
HEAD:src/i18n/en.ts:395:    namePlaceholder: 'Name',
HEAD:src/i18n/en.ts:396:    emailPlaceholder: 'Email',
HEAD:src/i18n/en.ts:397:    messagePlaceholder: 'Your message',
```

Classification: the two owner-confirmation comments are real approval blockers. The other matches are existing dictionary **key names** for normal search/form input hints (searchPlaceholder, messagePlaceholder, namePlaceholder, emailPlaceholder), not fake content or release blockers. No lorem, example.com, hardcoded test content or placeholder-image reference was found in changed production files. The owner-provided photos are real assets; the unused legacy aboutpic2.png remains but is not rendered.

## Copy awaiting owner approval

| Key (`about.editorial.*`) | Arabic | English | Current UI |
|---|---|---|---|
| `eyebrow` | ABOUT AHLAM | ABOUT AHLAM | Rendered / accessibility |
| `heroStart` | عن | About | Rendered / accessibility |
| `heroEnd` | أحلام | Ahlam | Rendered / accessibility |
| `heroTitle` | عن أحلام | About Ahlam | Rendered / accessibility |
| `role` | مدرّبة يوغا وحركة، تؤمن أن العناية بالجسم والعقل أسلوب حياة. | A yoga and movement instructor who believes caring for the body and mind is a way of life. | Rendered / accessibility |
| `place` | رام الله · فلسطين | Ramallah · Palestine | Not rendered |
| `practices` | حصص · جلسات فردية · محاضرات | Classes · Private sessions · Lectures | Not rendered |
| `contact` | تواصلي معنا | Get in touch | Rendered / accessibility |
| `marqueeLabel` | كلمات من مساحتنا | Words from our space | Rendered / accessibility |
| `words[0]` | يوغا | Yoga | Rendered / accessibility |
| `words[1]` | حركة | Movement | Rendered / accessibility |
| `words[2]` | تنفّس | Breath | Rendered / accessibility |
| `words[3]` | وعي | Awareness | Rendered / accessibility |
| `words[4]` | توازن | Balance | Rendered / accessibility |
| `words[5]` | هدوء | Calm | Rendered / accessibility |
| `approachEyebrow` | نهجي | MY APPROACH | Rendered / accessibility |
| `approachLine1` | حركة واعية، | Mindful movement, | Rendered / accessibility |
| `approachLine2` | بلا ضغط ولا أحكام | without pressure or judgment | Rendered / accessibility |
| `approachParagraph` | أصمّم كل حصة لتكون مساحة آمنة تتحركين فيها بإيقاعك أنتِ، سواء كانت هذه خطوتك الأولى على السجادة أو كنتِ تمارسين منذ زمن. | I design every class as a safe space where you can move at your own pace, whether this is your first step onto the mat or you have been practising for years. | Rendered / accessibility |
| `approachItems[0].title` | الجسم أولاً، دائماً | The body comes first. Always. | Rendered / accessibility |
| `approachItems[0].text` | نبدأ بالإصغاء لجسمك قبل أي حركة. لا نجبر ولا نقارن، ونتقدّم بالقدر الذي يناسبك اليوم. | We begin by listening to your body before moving. No forcing or comparing; we progress in a way that feels right for you today. | Rendered / accessibility |
| `approachItems[1].title` | التنفس أساس كل شيء | Breath is the foundation | Rendered / accessibility |
| `approachItems[1].text` | نربط الحركة بالنَّفَس، فتتحوّل التمارين إلى لحظات هدوء تخففين فيها ضغط اليوم وتعودين أخفّ وأوضح. | We connect movement with breath, turning exercise into moments of calm where you can ease the day’s pressure and return feeling lighter and clearer. | Rendered / accessibility |
| `spaceTitle` | مساحة تشبهك | A space that feels like you | Rendered / accessibility |
| `spaceText` | أجواء دافئة وداعمة لكل من تبحث عن توازن في حياتها اليومية. | A warm, supportive atmosphere for anyone seeking balance in everyday life. | Rendered / accessibility |
| `spaceImageAlt` | أحلام جالسة وتحمل وعاءً صوتيًا | Ahlam seated with a singing bowl | Rendered / accessibility |
| `storyEyebrow` | MY STORY | MY STORY | Rendered / accessibility |
| `classHeading` | كيف تكون الحصة؟ | What does a class feel like? | Rendered / accessibility |
| `steps[0].title` | نهيّئ الجسم والنَّفَس | Prepare the body and breath | Rendered / accessibility |
| `steps[0].text` | نبدأ بتنفّس هادئ وحركات خفيفة تجهّزك للحصة. | We begin with calm breathing and gentle movements to ease you into the class. | Rendered / accessibility |
| `steps[1].title` | نتحرك بوعي وبإيقاعك | Move mindfully, at your pace | Rendered / accessibility |
| `steps[1].text` | تمارين مختارة بعناية، مع خيارات تناسب مستواك وراحتك. | Thoughtfully chosen exercises, with options for your level and comfort. | Rendered / accessibility |
| `steps[2].title` | نختم بهدوء واسترخاء | Finish with calm and relaxation | Rendered / accessibility |
| `steps[2].text` | لحظات سكون في النهاية لتخرجي أخفّ وأكثر صفاءً. | A few still moments at the end, so you can leave feeling lighter and clearer. | Rendered / accessibility |
| `valuesHeading` | قيمي | My values | Rendered / accessibility |
| `values[0].title` | لكل جسم إيقاعه | Every body has its own rhythm | Rendered / accessibility |
| `values[0].text` | كل خطوة تبدأ بالإصغاء لما يناسبك اليوم. | Each step begins by listening to what feels right for you today. | Rendered / accessibility |
| `values[1].title` | بلا أحكام ولا مقارنة | No judgment. No comparison. | Rendered / accessibility |
| `values[1].text` | مساحة نلتقي فيها كما نحن، دون حاجة لإثبات شيء. | A space to meet as we are, with nothing to prove. | Rendered / accessibility |
| `values[2].title` | الاستمرارية أهم من الكمال | Consistency over perfection | Rendered / accessibility |
| `values[2].text` | نفسح مكاناً للمحاولة، وللعودة من جديد. | We make room for trying, and for beginning again. | Rendered / accessibility |
| `offersLabel` | الخدمات المتاحة | Available services | Not rendered |
