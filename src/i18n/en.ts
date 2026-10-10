import type { ar } from './ar'

export const en: typeof ar = {
  common: {
    minutesSuffix: 'min',
    notSpecified: 'Not specified',
  },
  nav: {
    home: 'Home',
    about: 'About',
    classes: 'Classes',
    courses: 'Lectures',
    privateSessions: 'Private Sessions',
    shop: 'Shop',
    contact: 'Contact',
    account: 'My Account',
    login: 'Log In',
  },
  footer: {
    address: 'Ahlam Space, Ramallah',
    tagline: 'Yoga, fitness, dance, and mindful daily rituals.',
    policiesAriaLabel: 'Policies and terms',
    termsLink: 'Terms of Use',
    privacyLink: 'Privacy Policy',
    cancellationLink: 'Cancellation & Refund Policy',
    deliveryLink: 'Delivery & Payment Policy',
  },
  langSwitcher: {
    ariaLabel: 'Change site language',
    switchToEnglish: 'English',
    switchToArabic: 'العربية',
  },
  home: {
    heroHeadingLine1: 'A space for movement,',
    heroHeadingLine2: 'awareness, and balance.',
    heroParagraph:
      'At Ahlam Space, we believe movement isn’t just exercise for the body — it’s a deeper journey toward a more balanced, aware life.',
    heroCtaExplore: 'Explore Classes',
    heroCtaBookNow: 'Book Now',
    heroImageAlt: 'Ahlam sitting in meditation on a yoga mat in the studio',
    services: [
      {
        title: 'Private Sessions',
        description: 'Sessions tailored to your needs and goals.',
      },
      {
        title: 'Lectures',
        description:
          'A range of programs for awareness, movement, and a more balanced lifestyle.',
      },
      {
        title: 'Group Classes',
        description: 'Yoga and movement classes in a warm, supportive space.',
      },
      {
        title: 'Thoughtfully Chosen Products',
        description:
          'Products that support your journey toward a more balanced, comfortable life.',
      },
    ],
    aboutHeading: 'Welcome to Ahlam Space',
    aboutParagraph:
      'A space designed to be more than just a place to exercise — an invitation to return to yourself, through movement, awareness, and balance in everyday life.',
    aboutCta: 'Learn More',
    aboutImageAlt: 'Ahlam practicing yoga in a calm space',
    weekSectionHeading: 'This Week’s Classes',
    weekSectionSubtitle: 'Pick the time that works for you and start your journey.',
    weekSectionViewAll: 'View All Classes',
    sessionsError: 'Unable to load classes right now.',
    sessionsEmpty: 'No upcoming classes available right now.',
    sessionNameFallback: 'Class',
    timeLabel: 'Time',
    durationLabel: 'Duration',
    priceLabel: 'Price',
    remainingLabel: 'Spots remaining',
    remainingSeatsSuffix: 'spots left',
    finalCtaHeading: 'Take time for yourself.',
    finalCtaParagraph:
      'Choose the right class and start your journey toward more mindful, balanced movement.',
    finalCtaButton: 'Book Your Class',
  },
  about: {
    heading: 'Who is Ahlam?',
    subheading: 'A journey of passion toward a more balanced, aware life.',
    paragraph:
      'Ahlam is a yoga and movement instructor who believes that caring for the body and mind isn’t a luxury — it’s a way of life. Through her experience and passion, she aims to create a space that helps everyone move mindfully, connect with themselves, and reach greater balance in their daily life.',
    ctaDiscoverStory: 'Discover My Story',
    imageAlt: 'Ahlam in a yoga pose at the studio',
    myStoryHeading: 'My Story',
    myStoryParagraph1:
      'My journey with movement and yoga began as a search for balance and calm, and over time this passion grew into a message I share with others.',
    myStoryParagraph2:
      'I believe movement isn’t just exercise for the body, but a chance to understand ourselves better, ease the pressure of daily life, and build a calmer, more mindful relationship with our bodies.',
    quoteLine1: 'To me, movement isn’t just exercise...',
    quoteLine2: 'it’s a space where we come back to ourselves.',
    quoteAuthor: '— Ahlam',
    offerHeading: 'What I Offer',
    services: [
      {
        title: 'Private Sessions',
        description: 'Sessions tailored to your needs and goals.',
      },
      {
        title: 'Lectures',
        description:
          'Spaces for learning, awareness, movement, and a more balanced lifestyle.',
      },
      {
        title: 'Group Classes',
        description: 'Yoga and movement classes in a warm, supportive space.',
      },
    ],
    finalHeading: 'Ready to start your journey?',
    finalParagraph: 'Discover the classes and choose the right space for you.',
    ctaExplore: 'Explore Classes',
    ctaBookNow: 'Book Now',
  },
  classes: {
    eyebrow: 'Weekly movement',
    heading: 'Classes',
    subtitle:
      'Explore yoga, fitness, and dance classes, then choose the upcoming session that suits you.',
    noClasses: 'No classes available right now.',
    upcomingHeading: 'Upcoming Sessions',
    noUpcoming: 'No upcoming sessions for this class right now.',
    requestedNotice: 'Complete your booking by choosing a payment method.',
    dateLabel: 'Date',
    timeLabel: 'Time',
    locationLabel: 'Location',
    locationFallback: 'Ahlam Studio',
    availableSeatsLabel: 'Available spots',
    seatsAvailableOf: 'spots available of',
  },
  schedule: {
    bookButtonIdle: 'Book This Class',
    bookButtonLoading: 'Booking...',
    consentPrefix: 'By continuing you agree to the',
    consentTerms: 'Terms',
    consentAnd: 'and',
    consentCancellation: 'Cancellation Policy',
    fullBadge: 'Full',
    fullMessage: 'Sorry, this class is full',
    tooLateMessagePrefix:
      'Sorry, there’s no longer enough time to complete a bank transfer before this class starts. Please',
    tooLateContactLink: 'contact us',
    tooLateMessageSuffix: 'directly to arrange your booking.',
    errorMessage: 'Something went wrong while booking, please try again',
  },
  courses: {
    list: {
      heading: 'Lectures',
      subtitle:
        'Choose the right course, then pick a payment method. Purchases stay pending until payment is manually confirmed.',
      accessDeniedNotice:
        'You can’t access this content yet — you need to complete the purchase and have payment confirmed first.',
      notFoundNotice: 'This course isn’t available right now.',
      loadError: 'Unable to load courses right now.',
      empty: 'No courses are available for purchase right now.',
      contentTypeVideo: 'Video',
      contentTypeArticle: 'Article',
      loginToBuy: 'Log in to purchase',
      watchNow: 'Watch Now',
      pendingPayment: 'Awaiting payment confirmation',
    },
    detail: {
      eyebrow: 'Lectures',
      videoUnsupported: 'Your browser doesn’t support video playback.',
      videoLoadError: 'Unable to load the video right now, try reloading the page.',
      noArticleContent: 'No content yet.',
    },
    purchaseButton: {
      buying: 'Registering...',
      buyNow: 'Buy Now',
      purchaseError: 'Something went wrong registering your order, please try again',
    },
  },
  shop: {
    list: {
      heroHeading: 'Small things, made with care.',
      heroParagraph:
        'From Zulfa and Ahlam Space, picks that add warmth, balance, and calmer moments to your day.',
      heroImageAlt: 'Wellness and self-care products from Ahlam Space',
      searchSrLabel: 'Search for a product',
      searchPlaceholder: 'Search for a product...',
      categoriesAriaLabel: 'Product categories',
      categoryAll: 'All',
      categoryCandles: 'Zulfa Candles',
      categoryFood: 'Healthy Food',
      categoryJournal: 'Ahlam Space Journal',
      sortSrLabel: 'Sort by',
      sortDefault: 'Sort by',
      sortPriceAsc: 'Price: Low to High',
      sortPriceDesc: 'Price: High to Low',
      sortName: 'Name',
      loadError: 'Unable to load products right now. Please try again later.',
      empty: 'No products available right now.',
      noMatches: 'No products match your search.',
      priceComingSoon: 'Price coming soon',
      productImageAltPrefix: 'Photo of',
      unavailable: 'Unavailable',
    },
    product: {
      eyebrow: 'Studio shop',
      variantsHeading: 'Available Options',
      variantsLoadError: 'Unable to load options right now.',
      noVariants: 'No options available.',
      sizeLabel: 'Size',
      colorLabel: 'Color',
      stockLabel: 'Stock',
      skuLabel: 'SKU',
      priceComingSoon: 'Price coming soon',
    },
    addToCart: {
      addToCart: 'Add to Cart',
      unavailable: 'Unavailable',
    },
    cartBar: {
      addedToast: 'Added to cart',
      cartLabel: 'Cart',
      itemSingular: 'item',
      itemPlural: 'items',
      viewCart: 'View Cart',
    },
  },
  privateSessions: {
    heading: 'Private Sessions',
    services: [
      {
        title: 'Personal Facilitation Journey',
        description:
          'A full month of personal accompaniment. Throughout this program you won’t be alone on your journey of change — I’ll be with you every step, following your progress, sending you daily guidance, exercises, reflections, or simple tasks suited to your needs and goals. Together we aim to build healthy habits, organize different areas of life, and strengthen commitment, so change becomes a way of life rather than a temporary phase.',
      },
      {
        title: 'Sound Healing Session',
        description:
          'A deep relaxation journey using Tibetan bowls and sound healing tools, helping to calm the nervous system, ease tension, and enhance well-being.',
      },
      {
        title: 'Private One-on-One Sessions',
        description:
          'One-on-one sessions designed around your needs, to explore together the challenges you’re going through and build practical steps toward greater emotional and psychological balance. Sessions may include working on stress management, building self-confidence, regulating emotions, discovering patterns holding you back, and creating a plan suited to your goals and circumstances.',
      },
    ],
    requestButton: 'Book a Session',
    formHeading: 'Session Booking Request',
    sessionTypeLabel: 'Session Type',
    fullNameLabel: 'Full Name',
    phoneLabel: 'Phone Number',
    emailLabel: 'Email',
    messageLabel: 'Message',
    messagePlaceholder: 'Tell me more about your interest in this session',
    submitting: 'Sending...',
    submit: 'Send Request',
    successMessage: 'Your request was sent successfully, we’ll be in touch soon.',
    errorPrefix: 'Something went wrong sending your request',
    errorSuffix: '. Please try again.',
  },
  contact: {
    eyebrow: 'Contact',
    heading: 'Tell us what you’re looking for.',
    paragraph:
      'Ask about classes, private sessions, products, or finding the right place to begin.',
    nameLabel: 'Name',
    emailLabel: 'Email',
    messageLabel: 'Message',
    namePlaceholder: 'Name',
    emailPlaceholder: 'Email',
    messagePlaceholder: 'Your message',
    sending: 'Sending...',
    send: 'Send Message',
    genericError: 'Unable to send message.',
    sentMessage: 'Message sent.',
  },
  legal: {
    onlyArabicNote: 'This policy is currently available in Arabic only.',
  },
}
