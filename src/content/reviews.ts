// Real participant testimonials, transcribed from a PDF the owner (Ahlam)
// supplied directly. `approved` starts false on every entry - this file
// must only ever have an entry flipped to true by the owner, after she has
// confirmed that specific participant's consent to be quoted publicly.
//
// Review 3 contains the phrase "سلمى الحلوة الذكية" - it is ambiguous
// whether "سلمى" is the author's actual name or just part of a sentence.
// The text is kept exactly as written and no name is shown; the owner
// should confirm with the participant before approving it (see the PR
// description for this branch).
//
// Reviews 6 and 7 are marked `sensitive: true` because they describe the
// service in psychologist/therapeutic terms ("سيكولوجية" / "psychologist").
// The owner should confirm this framing is accurate and appropriate before
// approving either one for the public site.
//
// `hasPhoto` on reviews 1, 2, 4, 5: a best-effort, NOT fully certain reading
// of which reviews had a participant photo next to them in the original
// PDF (no photo file exists anywhere in this repo - this only reserves
// circular placeholder space in the UI for where a real photo will go). The
// owner is expected to confirm or correct this mapping once she attaches
// the actual photo files.
export type Review = {
  id: string
  name?: string
  text: string
  lang?: 'ar' | 'en'
  approved: boolean
  sensitive?: boolean
  hasPhoto?: boolean
}

export const reviews: Review[] = [
  {
    id: '1',
    text: `احلام، يا حلوة الروح والقلب
مش عارفة كيف أوصف قديش وجودك وجلساتك تركوا أثر حلو فيّ.. معك ما كانت مجرد رياضة، كانت فسحة إلي من ضغوط الحياة، وفرصة أرجع أسمع حالي، أحس بجسمي، أنتبه لتنفّسي، وألاقي هدوئي وراحتي من جديد.
أثّرتِ فيّ بطريقة حلوة، خلّتيني أكون أوعى بحالي، أقرب لجسمي، أحنّ على نفسي. صرت أشوف تفاصيل الحياة بعيون أجمل، وأعيش لحظات بتتنفّس الروح قبل الجسد. والأحلى إنو بعد كل جلسة معك برجع أخفّ، أروق، ومليانة طاقة حلوة.
أحلام، إنتِ مش بس مدرّبة بتدرّب الجسم، إنتِ إنسانة بتترك أثر بالقلب، وبتزرع فينا شعور حلو بضل معنا حتى ما بعد ما تخلص الجلسة. شكرًا لأنك كنتِ جزءًا من هالتغيير الحلو فيّ، ولأنك بتخلّيني أحب حالي وحياتي أكثر.`,
    lang: 'ar',
    approved: false,
    hasPhoto: true,
  },
  {
    id: '2',
    text: `من ٣ سنين قررت ارجع للحركة وبما اني ما بحب الرياضات القوية توجهت لممارسة اليوغا بأحلى مساحة ومع أحلى مدربة أحلام
بس اللي استفادته من اليوغا كان أكتر بكتير من تحسين مرونتي وتقوية عضلاتي، صرت أحس بالراحة والهدوء والتوازن بين جسمي وروحي
علمتني أحلام مع تمارين التنفس بعمق يخفف التوتر و يوصل للسلام الداخلي. وبالالتزام بحس بأني أقرب من حالي وبعيش اللحظة بكل وعي. صارت اليوغا بالنسبة لي أسلوب حياة بيعطيني الطاقة الإيجابية والسعادة والطمأنينة
مع أحلام مش بس بستنى اللقاءات بشوق إلا كمان الفعاليات والجلسات والورشات و المشاوير الرائعة مع مجموعات صبايا و أرواح حلوة دايماً بتكون بيننا أشياء مشتركة وراحة رهيبة`,
    lang: 'ar',
    approved: false,
    hasPhoto: true,
  },
  {
    id: '3',
    text: `مع أحلام عشت كتير رحل من اول ما بدينا لليوم
رحلة كبيرة في آني ارجع لحالي
سلمى الحلوة الذكية الي ربنا أعطاها كتير هدايا ومميزات نسيت منها وتخبى منها ومع أحلام بنرجع شوي شوي
من 3 سنين كانت بالضبط أول جلسة فردية وكملنا بكتير شغل الي كان مع مجموعة او لحالي او حتى متابعة على الواتس
واليوم الي بشوفي في 2026 بسدقش انوانا الي بأول جلسة مع احلام والي كانت جلسة مع احلام بشهر 11/ 2023
ممتنة كتير لربنا الي عرفنا على بعض وحظك في طريقي
حبيبتي انتي`,
    lang: 'ar',
    approved: false,
  },
  {
    id: '4',
    name: 'تيماء',
    text: `اول اشي صباحك كلشي حلو وخير وبركة
احلام حابة احكيلك اكم شغلة ببالي
اول اشي بتشكرك ع كلشي اولا ع الوعي الي دخلتيه ع حياتي وع كمية الادراك الي صارت معي من يوم ما عرفتك حسيت كانو كنت مغمضة وصححت
حرفيا خليتيني اطلع ع الدنيا بطريقة تانية خليني اشوف كتير تفاصيل عيوني وقلبي ما كان شايفهم
بحب كل اللقاءات الي بينا
سواء مع الجروبات او اللقاءات الخاصة
في شعور مريح وغريب بحسو بس اكون بالمكان عندك بحس طاقتك هي الي بتعطيني الشعور
بحب اهتمامك وفهمك للتفاصيل وللشعور الي بحاول أوصلك اياها
صراحة كمية الراحة والشعور بالندم وفهم هالدنيا وكلشي فيها وإيماني بربي حتى كلو اتغير من لما عرفت
ربنا باركلك ويزيدك نور وصحة وخير وبركة`,
    lang: 'ar',
    approved: false,
    hasPhoto: true,
  },
  {
    id: '5',
    name: 'مريم',
    text: `انا مريم صرلي مشتركه مع مساحة احلام سنه تقريبا اخذ معها كنت باخد معها حصص يوغا وكثير غيرت مني ومن نفسيتي وجديد
بلشت معها حصص مكس طبعا هاي الحصص الها فادتني كثير وغيرت كثير من حياتي تقريبا انا كان عندي زي تشنج بكتفي
اليمين وما كنت بقدر أحركو طبعا بعد التزامي بحصص المكس كتفي اتحسن كثير ومش بس كتفي تقريبا كل جسمي
وصرت احس حالي اقوى وجسمي اقوى وطبعا بشكر احلام ومساحتها على هاد الاشي وعلى كلشي بتقدمو`,
    lang: 'ar',
    approved: false,
    hasPhoto: true,
  },
  {
    id: '6',
    text: `في أشخاص بيفوتوا حياتنا، ويتركوا أثر أكبر بكتير من اللي ممكن الكلمات توصفه، وإنتِ بالنسبة إلي من هالأشخاص.
مش عارفة من وين أبلّش، ولا كيف ممكن أوفيكي حقك بالكلام، لأنك كنتِ جزء من رحلة كتير مهمة بحياتي، ورافقتيني بأوقات كانت من أصعب الأوقات عليّ. كنتِ موجودة لما كنت بحاجة لحدا يسمعني، يفهمني، يطمّنّي، ويرشدني للطريق لما كنت أحس حالي تايهة. كنتِ دعم، وسند، وأمان، ووجودك كان يفرق معي أكتر مما بتتخيلي.
أكتر إشي بقدّره فيكي إنك مش بس بتقدّمي جلسات أو بتعطي أدوات ونصائح، إنتِ فعلًا بتحطي من روحك وقلبك بكل إشي بتعمليه. اهتمامك، احتواؤك، طريقتك بالحكي، وقدرتك إنك تسمعي من قلبك، كلهم أشياء بتخلّي الواحد يحس إنه مش لحاله، وإنه في حدا شايفه وفاهمه ومؤمن فيه، حتى بالأوقات اللي هو نفسه مش قادر يؤمن بحاله. وحتى لما كنت مشغولة، كنت تحاولي تكوني موجودة وترّدي عليّ بقدر ما تقدري، وهالشي بالنسبة إلي كان إله قيمة كبيرة جدًا.
الجلسات الفردية معك كانت مساحة آمنة إلي، مساحة أقدر فيها أكون على طبيعتي، أحكي، أعبّر، وأشوف الأمور من منظور مختلف. علّمتيني إنه التغيير مش لازم يصير بيوم وليلة، وإنه مش مطلوب مني أعمل كل إشي مرة وحدة، وإنه كل خطوة صغيرة، مهما كانت بسيطة، إلها قيمة، ونحاول، وأحيانًا مجرد إننا نكمّل، ونكون أحنّ على حالنا، هو بحد ذاته إنجاز كبير.
ومن أكتر الأشياء اللي بحبها بحصص اليوجا معك! عنجد تجربة بتاخدني لعالم تاني فيه هدوء وسلام وراحة، وبحس فيه إني برجع لحالي، بعيدًا عن ضجيج الحياة وكثرة التفكير والضغط. طاقتك، صوتك، حضورك، وطريقتك بتوجيهنا خلال التمارين والتنفس، كلهم يخلقوا جو مميز وصعب يتوصف. بتخلّينا ننتبه لأنفاسنا، نسمح لحالنا نرتاح، ناخد نفس عميق، ونرجع نحسّه ونشعله.
علّمتينا إنه النفس مش مجرد شهيق وزفير، وإنه الهدوء مش ضعف، وإنه مش لازم نضل نركض طول الوقت عشان نتقدّم. أحيانًا أكبر خطوة ممكن نعملها لأنفسنا هي إننا نوقف شوي، ناخد نفس عميق، ونحسّ لحالنا رحمة بدل ما نظل عالقين بكل إشي براسنا.
علّمتينا كمان إنه النمو الحقيقي بيصير خطوة صغيرة ورا خطوة صغيرة، وإنه مش لازم نكون أحسن ولا أكمل من حالنا، نتقبّل أيامنا الحلوة والصعبة، ونفهم إنه كل إشي إله وقته، وإنه مسموح إله يكون على طبيعته. أما عن طاقتك وروحك الحلوة، فهاي لحالها حكاية، فيكي إشي مريح، دافي، وقريب للقلب. بتحسّي إنك بتنشري السلام والراحة بالمكان اللي بتكوني فيه.
والأجمل من كل هاد إنك من خلال المجتمع الأنثوي اللي بنيتيه، عم تخلقي مساحة بتجمّع النساء على الدعم والوعي والحب، والنمو. مساحة بتذكّر كل وحدة فينا إنها مش لحالها، وإننا فينا نتعلّم من بعض، ونقوّي بعض، ونكبر مع بعض، إله أثر حقيقي كبير جدًا، ووجود مجتمعات بهالروح، فيها احتواء حقيقي وتشجيع ووعي، وإنتِ من الناس اللي بيعرفوا كيف يحوّلوا هالفكرة إشي ملموس ونعيشه.
بشكرك من قلبي على كل جلسة، وكل كلمة، وكل مرة ساعديتيني أشوف إشي ما كنت قادرة أشوفه، وكل مرة ذكّرتيني إنه الطريق مش لازم يكون كامل عشان يكون معنى. بشكرك لأنك جزء من رحلتي، ولأنك ساعديتني أتعامل مع حالي بطريقة أكتر وعي، وأفهم مشاعري. أتذكّر إنه حتى بأصعب المراحل فينا نلاقي طريقنا شوي شوي.
يمكن ما بتعرفي قديش التفاصيل الصغيرة اللي بتعمليها بتترك أثر كبير، بس بالنسبة إلنا هي جزء من شغلك الحلوة اللي صارت جزء من رحلتي ورسالتك. يمكن يكون من خلال حصة، أو جلسة، أو نفس عميق خلال حصة يوجا، أو كلمة منك كانت بالضبط الإشي اللي كنا بحاجة إله بهداك اليوم. وهاد من أجمل الأشياء الممكن إنسان يقدّمها لإنسان تاني.
بتمنالك من كل قلبي إنه كل الحب والطاقة الحلوة اللي بتعطيها للناس يرجعولك أضعاف، وإنك تضلّي دايمًا بهالروح الجميلة، وبهالقلب اللي بيعرف يحتوي، ويوصل للقلب قبل أي إشي تاني. بتمنالك بكل امرأة بتساعديها، وبكل روح بتلمسيها، وبكل خطوة صغيرة بتكوني سبب إنها تصير.
شكرًا لأنك مش بس بتعلّمينا مساحة نتنفّس، بل بتذكّرينا نهدأ، نتعلّم، ونرجع نبلّش من جديد. شكرًا لأنك بتذكّرينا إنه مش مطلوب منّا نكون أقوياء طول الوقت، وإنه عادي نتعب، وعادي نمشي ببطء.
إنتِ مش بس سيكولوجية، إنتِ إنسانة بترافق الناس برحلتهم وبتساعدهم يرجعوا يلاقوا أرواحهم، وبتترك أثر حلو برحلتهم. وأنا ممتنة من كل قلبي لكل هالدعم والاحتواء. كل الحب والتقدير إلك، ولروحك، ولرسالتك، ولكل إشي حلو فيكي، ولكل إشي حلو بتقدّميه للعالم.`,
    lang: 'ar',
    approved: false,
    sensitive: true,
  },
  {
    id: '7',
    text: `I'm so grateful to have had you by my side during some of the hardest moments of my life.
You've been so much more than a psychologist to me — you've been a source of support, comfort, guidance, and strength when I needed it most.
Your individual sessions have helped me understand myself better, navigate my emotions, and learn to be kinder and more patient with myself. Your care, dedication, and willingness to listen have made such a meaningful difference in my journey.
Your yoga classes are truly something special. They take you to another world, where you can reconnect with yourself, find peace, breathe, and simply be present. Through your beautiful energy and calming presence, you've taught us the importance of slowing down, trusting the process, and remembering that every big change begins with small steps.
What makes you truly special is your beautiful soul, your genuine care, and the warmth you bring into every space you enter. The women's community you've created is such a safe, inspiring, and empowering place to grow, heal, and connect.
Thank you for being there, for every kind word, every session, every reminder to breathe, and every little step you've helped me take. You have a beautiful gift for making people feel seen, supported, and understood.
You don't just teach people how to heal and grow — you make them feel that they don't have to do it alone. And that is something truly priceless. I'm so lucky our paths crossed. Thank you for being you!`,
    lang: 'en',
    approved: false,
    sensitive: true,
  },
]
