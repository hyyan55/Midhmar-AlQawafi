export interface SeedEra {
  sourceId: number;
  slug: string;
  nameAr: string;
  nameEn: string;
  periodLabel: string;
  description: string;
  sortOrder: number;
}

export interface SeedMeter {
  sourceId: number;
  slug: string;
  nameAr: string;
  patternAr: string;
  description: string;
}

export interface SeedTheme {
  sourceId: number;
  slug: string;
  nameAr: string;
  description: string;
}

export interface SeedRhyme {
  sourceId: number;
  letter: string;
  nameAr: string;
}

export interface SeedPoemType {
  sourceId: number;
  slug: string;
  nameAr: string;
}

export interface SeedPoet {
  sourceId: number;
  slug: string;
  nameAr: string;
  titleAr: string | null;
  eraSlug: string;
  birthYearLabel: string | null;
  deathYearLabel: string | null;
  bioAr: string;
  avatarKey: string;
}

export interface SeedPoem {
  sourceId: number;
  titleAr: string;
  poetSlug: string;
  eraSlug: string;
  meterSlug: string;
  themeSlug: string;
  rhymeLetter: string;
  poemTypeSlug: string;
  verses: Array<{ sadr: string; ajuz: string }>;
}

export interface SeedAchievement {
  code: string;
  titleAr: string;
  descriptionAr: string;
  category: string;
  xpBonus: number;
}

export const SEED_ERAS: SeedEra[] = [
  {
    sourceId: 1,
    slug: 'jahili',
    nameAr: 'العصر الجاهلي',
    nameEn: 'Pre-Islamic Era',
    periodLabel: 'قبل البعثة بقرن ونصف تقريباً',
    description: 'عصر المعلقات والفحول الأوائل حيث استقرت أوزان الخليل في السليقة العربية.',
    sortOrder: 1,
  },
  {
    sourceId: 2,
    slug: 'islamic',
    nameAr: 'صدر الإسلام',
    nameEn: 'Early Islamic Era',
    periodLabel: '1 – 40 هـ',
    description: 'عصر الصحابة وشعراء الدعوة والمخضرمين الذين شهدوا الجاهلية والإسلام.',
    sortOrder: 2,
  },
  {
    sourceId: 3,
    slug: 'umayyad',
    nameAr: 'العصر الأموي',
    nameEn: 'Umayyad Era',
    periodLabel: '41 – 132 هـ',
    description: 'عصر النقائض والغزل العذري والصريح والسياسة في الشام والعراق والحجاز.',
    sortOrder: 3,
  },
  {
    sourceId: 4,
    slug: 'abbasid',
    nameAr: 'العصر العباسي',
    nameEn: 'Abbasid Era',
    periodLabel: '132 – 656 هـ',
    description: 'ذروة الازدهار الشعري والفلسفي والبديع، وفيه المتنبي وأبو تمام والمعري.',
    sortOrder: 4,
  },
  {
    sourceId: 5,
    slug: 'andalusi',
    nameAr: 'العصر الأندلسي',
    nameEn: 'Andalusian Era',
    periodLabel: '92 – 897 هـ',
    description: 'شعر الطبيعة والموشحات والحنين في قرطبة وإشبيلية وغرناطة.',
    sortOrder: 5,
  },
  {
    sourceId: 6,
    slug: 'ayyubid_mamluk',
    nameAr: 'العصر الأيوبي والمملوكي',
    nameEn: 'Ayyubid & Mamluk Era',
    periodLabel: '567 – 923 هـ',
    description: 'عصر المدائح النبوية والتصوف والتجديد في الصنعة اللفظية.',
    sortOrder: 6,
  },
  {
    sourceId: 7,
    slug: 'modern',
    nameAr: 'العصر الحديث',
    nameEn: 'Modern Era',
    periodLabel: 'من القرن التاسع عشر حتى اليوم',
    description: 'عصر الإحياء والرومانسية والمهجر والالتزام مع شوقي وحافظ وإيليا والسياب.',
    sortOrder: 7,
  },
];

export const SEED_METERS: SeedMeter[] = [
  {
    sourceId: 1,
    slug: 'tawil',
    nameAr: 'البحر الطويل',
    patternAr: 'فَعُولُنْ مَفَاعِيلُنْ فَعُولُنْ مَفَاعِيلُنْ',
    description: 'أوسع بحور الشعر العربي في المعلقات والقصائد الجليلة.',
  },
  {
    sourceId: 2,
    slug: 'kamil',
    nameAr: 'البحر الكامل',
    patternAr: 'مُتَفَاعِلُنْ مُتَفَاعِلُنْ مُتَفَاعِلُنْ',
    description: 'بحر غنائي جزِل يصلح للحماسة والرثاء والمدح.',
  },
  {
    sourceId: 3,
    slug: 'basit',
    nameAr: 'البحر البسيط',
    patternAr: 'مُسْتَفْعِلُنْ فَاعِلُنْ مُسْتَفْعِلُنْ فَاعِلُنْ',
    description: 'من أكثر البحور انتشاراً في الحكم والمدائح والغزل.',
  },
  {
    sourceId: 4,
    slug: 'wafir',
    nameAr: 'البحر الوافر',
    patternAr: 'مُفَاعَلَتُنْ مُفَاعَلَتُنْ فَعُولُنْ',
    description: 'بحر متدفق الإيقاع يغلب على الفخر والحماسة.',
  },
  {
    sourceId: 5,
    slug: 'khafif',
    nameAr: 'البحر الخفيف',
    patternAr: 'فَاعِلَاتُنْ مُسْتَفْعِلُنْ فَاعِلَاتُنْ',
    description: 'بحر رشيق يجمع بين العذوبة والوقار.',
  },
  {
    sourceId: 6,
    slug: 'mutaqarib',
    nameAr: 'البحر المتقارب',
    patternAr: 'فَعُولُنْ فَعُولُنْ فَعُولُنْ فَعُولُنْ',
    description: 'بحر متلاحق النغم يكثر في الأناشيد والحماسة.',
  },
  {
    sourceId: 7,
    slug: 'ramal',
    nameAr: 'بحر الرمل',
    patternAr: 'فَاعِلَاتُنْ فَاعِلَاتُنْ فَاعِلَاتُنْ',
    description: 'بحر موسيقي رقراق شاع في الأندلس والموشحات والحديث.',
  },
  {
    sourceId: 8,
    slug: 'sari',
    nameAr: 'البحر السريع',
    patternAr: 'مُسْتَفْعِلُنْ مُسْتَفْعِلُنْ فَاعِلُنْ',
    description: 'بحر سريع الإيقاع يناسب المقطوعات والحكم.',
  },
];

export const SEED_THEMES: SeedTheme[] = [
  { sourceId: 1, slug: 'wisdom', nameAr: 'الحكمة', description: 'التأمل في الحياة والتجارب الإنسانية.' },
  { sourceId: 2, slug: 'pride', nameAr: 'الفخر والحماسة', description: 'الاعتزاز بالنفس والشجاعة والمروءة.' },
  { sourceId: 3, slug: 'ghazal', nameAr: 'الغزل والحنين', description: 'التعبير عن الوجد والشوق والجمال.' },
  { sourceId: 4, slug: 'praise', nameAr: 'المدح', description: 'الإشادة بالمكارم والقيادة والشمائل.' },
  { sourceId: 5, slug: 'elegy', nameAr: 'الرثاء', description: 'الوفاء للراحلين والتأمل في الفقد.' },
  { sourceId: 6, slug: 'description', nameAr: 'الوصف والطبيعة', description: 'تصوير المشاهد والربوع والديار.' },
  { sourceId: 7, slug: 'patriotism', nameAr: 'الوطنية والأرض', description: 'الانتماء إلى الأوطان واللغة والتاريخ.' },
];

export const SEED_RHYMES: SeedRhyme[] = [
  { sourceId: 1, letter: 'ل', nameAr: 'اللامية' },
  { sourceId: 2, letter: 'م', nameAr: 'الميمية' },
  { sourceId: 3, letter: 'ن', nameAr: 'النونية' },
  { sourceId: 4, letter: 'ر', nameAr: 'الرائية' },
  { sourceId: 5, letter: 'د', nameAr: 'الدالية' },
  { sourceId: 6, letter: 'ب', nameAr: 'البائية' },
  { sourceId: 7, letter: 'ع', nameAr: 'العينية' },
  { sourceId: 8, letter: 'س', nameAr: 'السينية' },
  { sourceId: 9, letter: 'ق', nameAr: 'القافية' },
  { sourceId: 10, letter: 'ت', nameAr: 'التائية' },
];

export const SEED_POEM_TYPES: SeedPoemType[] = [
  { sourceId: 1, slug: 'qasida', nameAr: 'قصيدة عمودية' },
  { sourceId: 2, slug: 'muallaqa', nameAr: 'معلقة' },
  { sourceId: 3, slug: 'maqtuah', nameAr: 'مقطوعة' },
];

export const SEED_POETS: SeedPoet[] = [
  {
    sourceId: 1,
    slug: 'imru-al-qais',
    nameAr: 'امرؤ القيس',
    titleAr: 'الملك الضليل',
    eraSlug: 'jahili',
    birthYearLabel: 'نحو 500 م',
    deathYearLabel: 'نحو 540 م',
    bioAr: 'أشهر شعراء العرب في العصر الجاهلي وصاحب أشهر المعلقات، ومن أوائل من وقفوا على الأطلال واستجادوا التشبيه.',
    avatarKey: 'classical_desert',
  },
  {
    sourceId: 2,
    slug: 'antarah',
    nameAr: 'عنترة بن شداد',
    titleAr: 'فارس عبس',
    eraSlug: 'jahili',
    birthYearLabel: '525 م',
    deathYearLabel: '608 م',
    bioAr: 'شاعر وفارس من أصحاب المعلقات، جمع بين رقة الغزل في عبلة وصلابة الحماسة والفروسية.',
    avatarKey: 'classical_desert',
  },
  {
    sourceId: 3,
    slug: 'zuhayr',
    nameAr: 'زهير بن أبي سلمى',
    titleAr: 'شاعر الحوليات',
    eraSlug: 'jahili',
    birthYearLabel: '520 م',
    deathYearLabel: '609 م',
    bioAr: 'حكيم الشعراء في الجاهلية وأحد أصحاب المعلقات، عُرف بتهذيب قصائده وببثّ الحكم الصادقة في السلم والخلق.',
    avatarKey: 'scholar_astrolabe',
  },
  {
    sourceId: 4,
    slug: 'al-khansa',
    nameAr: 'الخنساء',
    titleAr: 'تماضر بنت عمرو السلمية',
    eraSlug: 'islamic',
    birthYearLabel: '575 م',
    deathYearLabel: '645 م',
    bioAr: 'شاعرة مخضرمة أدركت الإسلام وأسلمت، وهي أعظم من رثى في تاريخ الشعر العربي بصدق العاطفة وجزالة اللفظ.',
    avatarKey: 'classical_desert',
  },
  {
    sourceId: 5,
    slug: 'hassan-ibn-thabit',
    nameAr: 'حسان بن ثابت',
    titleAr: 'شاعر الرسول',
    eraSlug: 'islamic',
    birthYearLabel: '563 م',
    deathYearLabel: '674 م',
    bioAr: 'شاعر الأنصار وصدر الإسلام، دافع بشعره عن الدعوة الإسلامية وخلّد أيامها ومواقفها.',
    avatarKey: 'qalam_ink',
  },
  {
    sourceId: 6,
    slug: 'jarir',
    nameAr: 'جرير بن عطية',
    titleAr: 'شاعر بني يربوع',
    eraSlug: 'umayyad',
    birthYearLabel: '33 هـ',
    deathYearLabel: '110 هـ',
    bioAr: 'أحد أقطاب الشعر في العصر الأموي إلى جانب الفرزدق والأخطل، امتاز برقة الغزل وعذوبة الأسلوب.',
    avatarKey: 'qalam_ink',
  },
  {
    sourceId: 7,
    slug: 'al-farazdaq',
    nameAr: 'الفرزدق',
    titleAr: 'همام بن غالب التميمي',
    eraSlug: 'umayyad',
    birthYearLabel: '38 هـ',
    deathYearLabel: '110 هـ',
    bioAr: 'من كبار شعراء العصر الأموي وأحد ثلاثي النقائض، اشتهر بالفخر القبلي والمدائح الجزلة.',
    avatarKey: 'classical_desert',
  },
  {
    sourceId: 8,
    slug: 'al-mutanabbi',
    nameAr: 'أبو الطيب المتنبي',
    titleAr: 'مالئ الدنيا وشاغل الناس',
    eraSlug: 'abbasid',
    birthYearLabel: '303 هـ',
    deathYearLabel: '354 هـ',
    bioAr: 'أشهر شعراء العربية على الإطلاق في العصر العباسي، اتسم شعره بالحكمة السائرة وعزة النفس وقوة السبك.',
    avatarKey: 'scholar_astrolabe',
  },
  {
    sourceId: 9,
    slug: 'abu-tammam',
    nameAr: 'أبو تمام الطائي',
    titleAr: 'حبيب بن أوس الطائي',
    eraSlug: 'abbasid',
    birthYearLabel: '188 هـ',
    deathYearLabel: '231 هـ',
    bioAr: 'رائد مذهب البديع والعمق الفكري في العصر العباسي، وصاحب ديوان الحماسة وبائية فتح عمورية.',
    avatarKey: 'scholar_astrolabe',
  },
  {
    sourceId: 10,
    slug: 'al-buhturi',
    nameAr: 'البحتري',
    titleAr: 'أبو عبادة الوليد الطائي',
    eraSlug: 'abbasid',
    birthYearLabel: '206 هـ',
    deathYearLabel: '284 هـ',
    bioAr: 'شاعر الصنعة اللفظية الرشيقة والموسيقى العذبة، صاحب السينية الشهيرة في إيوان كسرى.',
    avatarKey: 'qalam_ink',
  },
  {
    sourceId: 11,
    slug: 'al-maarri',
    nameAr: 'أبو العلاء المعري',
    titleAr: 'رهين المحبسين',
    eraSlug: 'abbasid',
    birthYearLabel: '363 هـ',
    deathYearLabel: '449 هـ',
    bioAr: 'فيلسوف الشعراء وشاعر الفلاسفة في العصر العباسي، صاحب سقط الزند واللزوميات.',
    avatarKey: 'scholar_astrolabe',
  },
  {
    sourceId: 12,
    slug: 'al-shafii',
    nameAr: 'الإمام الشافعي',
    titleAr: 'محمد بن إدريس الشافعي',
    eraSlug: 'abbasid',
    birthYearLabel: '150 هـ',
    deathYearLabel: '204 هـ',
    bioAr: 'أحد أئمة الفقه واللغة والأدب، ترك ديواناً حافلاً بأبيات الحكمة والأخلاق والزهد.',
    avatarKey: 'qalam_ink',
  },
  {
    sourceId: 13,
    slug: 'ibn-zaydun',
    nameAr: 'ابن زيدون',
    titleAr: 'أبو الوليد القرطبي',
    eraSlug: 'andalusi',
    birthYearLabel: '394 هـ',
    deathYearLabel: '463 هـ',
    bioAr: 'وزير وشاعر أندلسي من أهل قرطبة، خلدت نونيته ذروة الغزل الرقيق والحنين الأندلسي.',
    avatarKey: 'andalus_arch',
  },
  {
    sourceId: 14,
    slug: 'lisan-al-din',
    nameAr: 'لسان الدين بن الخطيب',
    titleAr: 'ذو الوزارتين',
    eraSlug: 'andalusi',
    birthYearLabel: '713 هـ',
    deathYearLabel: '776 هـ',
    bioAr: 'مؤرخ ووزير وشاعر غرناطي، صاحب الموشح البديع جادك الغيث إذا الغيث همى.',
    avatarKey: 'andalus_arch',
  },
  {
    sourceId: 15,
    slug: 'al-busiri',
    nameAr: 'شرف الدين البوصيري',
    titleAr: 'صاحب البردة',
    eraSlug: 'ayyubid_mamluk',
    birthYearLabel: '608 هـ',
    deathYearLabel: '696 هـ',
    bioAr: 'شاعر المديح النبوي في العصر المملوكي، ذاعت قصيدته الكواكب الدرية في أرجاء العالم الإسلامي.',
    avatarKey: 'qalam_ink',
  },
  {
    sourceId: 16,
    slug: 'ahmad-shawqi',
    nameAr: 'أحمد شوقي',
    titleAr: 'أمير الشعراء',
    eraSlug: 'modern',
    birthYearLabel: '1868 م',
    deathYearLabel: '1932 م',
    bioAr: 'رائد مدرسة الإحياء والبعث والمسرح الشعري في العصر الحديث، لُقّب بأمير الشعراء.',
    avatarKey: 'scholar_astrolabe',
  },
  {
    sourceId: 17,
    slug: 'hafiz-ibrahim',
    nameAr: 'حافظ إبراهيم',
    titleAr: 'شاعر النيل',
    eraSlug: 'modern',
    birthYearLabel: '1872 م',
    deathYearLabel: '1932 م',
    bioAr: 'أحد أعلام الشعر الوطني والاجتماعي في العصر الحديث، وصاحب القصيدة الخالدة في اللغة العربية.',
    avatarKey: 'qalam_ink',
  },
  {
    sourceId: 18,
    slug: 'iliya-abu-madi',
    nameAr: 'إيليا أبو ماضي',
    titleAr: 'شاعر المهجر والتفاؤل',
    eraSlug: 'modern',
    birthYearLabel: '1889 م',
    deathYearLabel: '1957 م',
    bioAr: 'من أبرز شعراء الرابطة القلمية في المهجر، امتاز شعره بالتأمل الفلسفي والدعوة إلى الأمل والجمال.',
    avatarKey: 'andalus_arch',
  },
];

export const SEED_POEMS: SeedPoem[] = [
  {
    sourceId: 101,
    titleAr: 'قِفا نبكِ من ذكرى حبيب ومنزل',
    poetSlug: 'imru-al-qais',
    eraSlug: 'jahili',
    meterSlug: 'tawil',
    themeSlug: 'ghazal',
    rhymeLetter: 'ل',
    poemTypeSlug: 'muallaqa',
    verses: [
      { sadr: 'قِفا نَبكِ مِن ذِكرى حَبيبٍ وَمَنزِلِ', ajuz: 'بِسِقطِ اللِوى بَينَ الدَخولِ فَحَومَلِ' },
      { sadr: 'تَرى بَعَرَ الآرامِ في عَرَصاتِها', ajuz: 'وَقيعانِها كَأَنَّهُ حَبُّ فُلفُلِ' },
      { sadr: 'أَلا أَيُّها اللَيلُ الطَويلُ أَلا اِنجَلي', ajuz: 'بِصُبحٍ وَما الإِصباحُ مِنكَ بِأَمثَلِ' },
      { sadr: 'مِكَرٍّ مِفَرٍّ مُقبِلٍ مُدبِرٍ مَعاً', ajuz: 'كَجُلمودِ صَخرٍ حَطَّهُ السَيلُ مِن عَلِ' },
    ],
  },
  {
    sourceId: 102,
    titleAr: 'هل غادر الشعراء من متردم',
    poetSlug: 'antarah',
    eraSlug: 'jahili',
    meterSlug: 'kamil',
    themeSlug: 'pride',
    rhymeLetter: 'م',
    poemTypeSlug: 'muallaqa',
    verses: [
      { sadr: 'هَل غادَرَ الشُعَراءُ مِن مُتَرَدَّمِ', ajuz: 'أَم هَل عَرَفتَ الدارَ بَعدَ تَوَهُّمِ' },
      { sadr: 'وَلَقَد ذَكَرتُكِ وَالرِماحُ نَواهِلٌ', ajuz: 'مِنّي وَبيضُ الهِندِ تَقطُرُ مِن دَمي' },
      { sadr: 'فَوَدِدتُ تَقبيلَ السُيوفِ لِأَنَّها', ajuz: 'لَمَعَت كَبارِقِ ثَغرِكِ المُتَبَسِّمِ' },
      { sadr: 'يُخبِركِ مَن شَهِدَ الوَقيعَةَ أَنَّني', ajuz: 'أَغشى الوَغى وَأَعِفُّ عِندَ المَغنَمِ' },
    ],
  },
  {
    sourceId: 103,
    titleAr: 'سئمت تكاليف الحياة',
    poetSlug: 'zuhayr',
    eraSlug: 'jahili',
    meterSlug: 'tawil',
    themeSlug: 'wisdom',
    rhymeLetter: 'م',
    poemTypeSlug: 'muallaqa',
    verses: [
      { sadr: 'سَئِمتُ تَكاليفَ الحَياةِ وَمَن يَعِش', ajuz: 'ثَمانينَ حَولاً لا أَبا لَكَ يَسأَمِ' },
      { sadr: 'وَمَن يَكُ ذا فَضلٍ فَيَبخَل بِفَضلِهِ', ajuz: 'عَلى قَومِهِ يُستَغنَ عَنهُ وَيُذمَمِ' },
      { sadr: 'وَمَن يَجعَلِ المَعروفَ مِن دونِ عِرضِهِ', ajuz: 'يَفِرهُ وَمَن لا يَتَّقِ الشَتمَ يُشتَمِ' },
      { sadr: 'وَمَهما تَكُن عِندَ اِمرِئٍ مِن خَليقَةٍ', ajuz: 'وَإِن خالَها تَخفى عَلى الناسِ تُعلَمِ' },
    ],
  },
  {
    sourceId: 104,
    titleAr: 'أعيني جودا ولا تجمدا',
    poetSlug: 'al-khansa',
    eraSlug: 'islamic',
    meterSlug: 'mutaqarib',
    themeSlug: 'elegy',
    rhymeLetter: 'د',
    poemTypeSlug: 'qasida',
    verses: [
      { sadr: 'أَعَينَيَّ جودا وَلا تَجمُدا', ajuz: 'أَلا تَبكِيانِ لِصَخرِ النَدى' },
      { sadr: 'أَلا تَبكِيانِ الجَريءَ الجَميلَ', ajuz: 'أَلا تَبكِيانِ الفَتى السَيِّدا' },
      { sadr: 'طَويلَ النِجادِ رَفيعَ العِمادِ', ajuz: 'سادَ عَشيرَتَهُ أَمرَدا' },
      { sadr: 'وَإِنَّ صَخراً لَوالينا وَسَيِّدُنا', ajuz: 'وَإِنَّ صَخراً إِذا نَشتو لَنَحّارُ' },
    ],
  },
  {
    sourceId: 105,
    titleAr: 'قذى بعينك أم بالعين عوار',
    poetSlug: 'al-khansa',
    eraSlug: 'islamic',
    meterSlug: 'basit',
    themeSlug: 'elegy',
    rhymeLetter: 'ر',
    poemTypeSlug: 'qasida',
    verses: [
      { sadr: 'قَذىً بِعَينِكِ أَم بِالعَينِ عُوّارُ', ajuz: 'أَم ذَرَفَت إِذ خَلَت مِن أَهلِها الدارُ' },
      { sadr: 'وَإِنَّ صَخراً لَتَأتَمُّ الهُداةُ بِهِ', ajuz: 'كَأَنَّهُ عَلَمٌ في رَأسِهِ نارُ' },
      { sadr: 'جَلدٌ جَميلُ المُحَيّا كامِلٌ وَرِعٌ', ajuz: 'وَلِلحُروبِ لَدى الرَوعاتِ مِسعارُ' },
    ],
  },
  {
    sourceId: 106,
    titleAr: 'أغَرُّ عليه للنبوّة خاتم',
    poetSlug: 'hassan-ibn-thabit',
    eraSlug: 'islamic',
    meterSlug: 'tawil',
    themeSlug: 'praise',
    rhymeLetter: 'م',
    poemTypeSlug: 'qasida',
    verses: [
      { sadr: 'أَغَرُّ عَلَيهِ لِلنُبُوَّةِ خاتَمٌ', ajuz: 'مِنَ اللَهِ مَشهودٌ يَلوحُ وَيُشهَدُ' },
      { sadr: 'وَضَمَّ الإِلَهُ اِسمَ النَبِيِّ إِلى اِسمِهِ', ajuz: 'إِذا قالَ في الخَمسِ المُؤَذِّنُ أَشهَدُ' },
      { sadr: 'وَأَحسَنُ مِنكَ لَم تَرَ قَطُّ عَيني', ajuz: 'وَأَجمَلُ مِنكَ لَم تَلِدِ النِساءُ' },
      { sadr: 'خُلِقتَ مُبَرَّءاً مِن كُلِّ عَيبٍ', ajuz: 'كَأَنَّكَ قَد خُلِقتَ كَما تَشاءُ' },
    ],
  },
  {
    sourceId: 107,
    titleAr: 'إن العيون التي في طرفها حور',
    poetSlug: 'jarir',
    eraSlug: 'umayyad',
    meterSlug: 'basit',
    themeSlug: 'ghazal',
    rhymeLetter: 'ر',
    poemTypeSlug: 'qasida',
    verses: [
      { sadr: 'إِنَّ العُيونَ الَّتي في طَرفِها حَوَرٌ', ajuz: 'قَتَلنَنا ثُمَّ لَم يُحيينَ قَتلانا' },
      { sadr: 'يَصرَعنَ ذا اللُبِّ حَتّى لا حِراكَ بِهِ', ajuz: 'وَهُنَّ أَضعَفُ خَلقِ اللَهِ أَركانا' },
      { sadr: 'أَلَستُمُ خَيرَ مَن رَكِبَ المَطايا', ajuz: 'وَأَندى العالَمينَ بُطونَ راحِ' },
    ],
  },
  {
    sourceId: 108,
    titleAr: 'هذا الذي تعرف البطحاء وطأته',
    poetSlug: 'al-farazdaq',
    eraSlug: 'umayyad',
    meterSlug: 'basit',
    themeSlug: 'praise',
    rhymeLetter: 'م',
    poemTypeSlug: 'qasida',
    verses: [
      { sadr: 'هَذا الَّذي تَعرِفُ البَطحاءُ وَطأَتَهُ', ajuz: 'وَالبَيتُ يَعرِفُهُ وَالحِلُّ وَالحَرَمُ' },
      { sadr: 'هَذا اِبنُ خَيرِ عِبادِ اللَهِ كُلِّهِمُ', ajuz: 'هَذا التَقِيُّ النَقِيُّ الطاهِرُ العَلَمُ' },
      { sadr: 'يُغضي حَياءً وَيُغضى مِن مَهابَتِهِ', ajuz: 'فَما يُكَلَّمُ إِلّا حينَ يَبتَسِمُ' },
      { sadr: 'ما قالَ لا قَطُّ إِلّا في تَشَهُّدِهِ', ajuz: 'لَولا التَشَهُّدُ كانَت لاءُهُ نَعَمُ' },
    ],
  },
  {
    sourceId: 109,
    titleAr: 'على قدر أهل العزم تأتي العزائم',
    poetSlug: 'al-mutanabbi',
    eraSlug: 'abbasid',
    meterSlug: 'tawil',
    themeSlug: 'pride',
    rhymeLetter: 'م',
    poemTypeSlug: 'qasida',
    verses: [
      { sadr: 'عَلى قَدرِ أَهلِ العَزمِ تَأتي العَزائِمُ', ajuz: 'وَتَأتي عَلى قَدرِ الكِرامِ المَكارِمُ' },
      { sadr: 'وَتَعظُمُ في عَينِ الصَغيرِ صِغارُها', ajuz: 'وَتَصغُرُ في عَينِ العَظيمِ العَظائِمُ' },
      { sadr: 'وَقَفتَ وَما في المَوتِ شَكٌّ لِواقِفٍ', ajuz: 'كَأَنَّكَ في جَفنِ الرَدى وَهوَ نائِمُ' },
      { sadr: 'تَمُرُّ بِكَ الأَبطالُ كَلمى هَزيمَةً', ajuz: 'وَوَجهُكَ وَضّاحٌ وَثَغرُكَ باسِمُ' },
    ],
  },
  {
    sourceId: 110,
    titleAr: 'وا حر قلباه ممن قلبه شبم',
    poetSlug: 'al-mutanabbi',
    eraSlug: 'abbasid',
    meterSlug: 'basit',
    themeSlug: 'pride',
    rhymeLetter: 'م',
    poemTypeSlug: 'qasida',
    verses: [
      { sadr: 'وا حَرَّ قَلباهُ مِمَّن قَلبُهُ شَبِمُ', ajuz: 'وَمَن بِجِسمي وَحالي عِندَهُ سَقَمُ' },
      { sadr: 'أَنا الَّذي نَظَرَ الأَعمى إِلى أَدَبي', ajuz: 'وَأَسمَعَت كَلِماتي مَن بِهِ صَمَمُ' },
      { sadr: 'أَنامُ مِلءَ جُفوني عَن شَوارِدِها', ajuz: 'وَيَسهَرُ الخَلقُ جَرّاها وَيَختَصِمُ' },
      { sadr: 'الخَيلُ وَاللَيلُ وَالبَيداءُ تَعرِفُني', ajuz: 'وَالسَيفُ وَالرُمحُ وَالقِرطاسُ وَالقَلَمُ' },
    ],
  },
  {
    sourceId: 111,
    titleAr: 'عيد بأية حال عدت يا عيد',
    poetSlug: 'al-mutanabbi',
    eraSlug: 'abbasid',
    meterSlug: 'basit',
    themeSlug: 'wisdom',
    rhymeLetter: 'د',
    poemTypeSlug: 'qasida',
    verses: [
      { sadr: 'عيدٌ بِأَيَّةِ حالٍ عُدتَ يا عيدُ', ajuz: 'بِما مَضى أَم بِأَمرٍ فيكَ تَجديدُ' },
      { sadr: 'ما كُلُّ ما يَتَمَنّى المَرءُ يُدرِكُهُ', ajuz: 'تَجري الرِياحُ بِما لا تَشتَهي السُفُنُ' },
      { sadr: 'إِذا غامَرتَ في شَرَفٍ مَرومٍ', ajuz: 'فَلا تَقنَع بِما دونَ النُجومِ' },
      { sadr: 'وَلَم أَرَ في عُيوبِ الناسِ شَيئاً', ajuz: 'كَنَقصِ القادِرينَ عَلى التَمامِ' },
    ],
  },
  {
    sourceId: 112,
    titleAr: 'السيف أصدق أنباء من الكتب',
    poetSlug: 'abu-tammam',
    eraSlug: 'abbasid',
    meterSlug: 'basit',
    themeSlug: 'pride',
    rhymeLetter: 'ب',
    poemTypeSlug: 'qasida',
    verses: [
      { sadr: 'السَيفُ أَصدَقُ أَنباءً مِنَ الكُتُبِ', ajuz: 'في حَدِّهِ الحَدُّ بَينَ الجِدِّ وَاللَعِبِ' },
      { sadr: 'بيضُ الصَفائِحِ لا سودُ الصَحائِفِ في', ajuz: 'مُتونِهِنَّ جَلاءُ الشَكِّ وَالرِيَبِ' },
      { sadr: 'نَقلُ فُؤادَكَ حَيثُ شِئتَ مِنَ الهَوى', ajuz: 'ما الحُبُّ إِلّا لِلحَبيبِ الأَوَّلِ' },
      { sadr: 'كَم مَنزِلٍ في الأَرضِ يَألَفُهُ الفَتى', ajuz: 'وَحَنينُهُ أَبَداً لِأَوَّلِ مَنزِلِ' },
    ],
  },
  {
    sourceId: 113,
    titleAr: 'صنت نفسي عما يدنس نفسي',
    poetSlug: 'al-buhturi',
    eraSlug: 'abbasid',
    meterSlug: 'khafif',
    themeSlug: 'description',
    rhymeLetter: 'س',
    poemTypeSlug: 'qasida',
    verses: [
      { sadr: 'صُنتُ نَفسي عَمّا يُدَنِّسُ نَفسي', ajuz: 'وَتَرَفَّعتُ عَن جَدا كُلِّ جِبسِ' },
      { sadr: 'وَتَماسَكتُ حينَ زَعزَعَني الدَهرُ', ajuz: 'التِماساً مِنهُ لِتَعسي وَنَكسي' },
      { sadr: 'أَتاكَ الرَبيعُ الطَلقُ يَختالُ ضاحِكاً', ajuz: 'مِنَ الحُسنِ حَتّى كادَ أَن يَتَكَلَّما' },
      { sadr: 'وَقَد نَبَّهَ النَيروزُ في غَلَسِ الدُجى', ajuz: 'أَوائِلَ وَردٍ كُنَّ بِالأَمسِ نُوَّما' },
    ],
  },
  {
    sourceId: 114,
    titleAr: 'غير مجد في ملتي واعتقادي',
    poetSlug: 'al-maarri',
    eraSlug: 'abbasid',
    meterSlug: 'khafif',
    themeSlug: 'wisdom',
    rhymeLetter: 'د',
    poemTypeSlug: 'qasida',
    verses: [
      { sadr: 'غَيرُ مُجدٍ في مِلَّتي وَاِعتِقادي', ajuz: 'نَوحُ باكٍ وَلا تَرَنُّمُ شادي' },
      { sadr: 'صاحِ هَذي قُبورُنا تَملَأُ الرُحبَ', ajuz: 'فَأَينَ القُبورُ مِن عَهدِ عادِ' },
      { sadr: 'خَفِّفِ الوَطءَ ما أَظُنُّ أَديمَ ال', ajuz: 'أَرضِ إِلّا مِن هَذِهِ الأَجسادِ' },
      { sadr: 'تَعَبٌ كُلُّها الحَياةُ فَما أَع', ajuz: 'جَبُ إِلّا مِن راغِبٍ في اِزدِيادِ' },
    ],
  },
  {
    sourceId: 115,
    titleAr: 'دع الأيام تفعل ما تشاء',
    poetSlug: 'al-shafii',
    eraSlug: 'abbasid',
    meterSlug: 'wafir',
    themeSlug: 'wisdom',
    rhymeLetter: 'م',
    poemTypeSlug: 'maqtuah',
    verses: [
      { sadr: 'دَعِ الأَيّامَ تَفعَلُ ما تَشاءُ', ajuz: 'وَطِب نَفساً إِذا حَكَمَ القَضاءُ' },
      { sadr: 'وَلا تَجزَع لِحادِثَةِ اللَيالي', ajuz: 'فَما لِحَوادِثِ الدُنيا بَقاءُ' },
      { sadr: 'تَغَرَّب عَنِ الأَوطانِ في طَلَبِ العُلا', ajuz: 'وَسافِر فَفي الأَسفارِ خَمسُ فَوائِدِ' },
      { sadr: 'تَفَرُّجُ هَمٍّ وَاِكتِسابُ مَعيشَةٍ', ajuz: 'وَعِلمٌ وَآدابٌ وَصُحبَةُ ماجِدِ' },
    ],
  },
  {
    sourceId: 116,
    titleAr: 'أضحى التنائي بديلاً من تدانينا',
    poetSlug: 'ibn-zaydun',
    eraSlug: 'andalusi',
    meterSlug: 'basit',
    themeSlug: 'ghazal',
    rhymeLetter: 'ن',
    poemTypeSlug: 'qasida',
    verses: [
      { sadr: 'أَضحى التَنائي بَديلاً مِن تَدانينا', ajuz: 'وَنابَ عَن طيبِ لُقيانا تَجافينا' },
      { sadr: 'بِنتُم وَبِنّا فَما اِبتَلَّت جَوانِحُنا', ajuz: 'شَوقاً إِلَيكُم وَلا جَفَّت مَآقينا' },
      { sadr: 'نَكادُ حينَ تُناجيكُم ضَمائِرُنا', ajuz: 'يَقضي عَلَينا الأَسى لَولا تَأَسّينا' },
      { sadr: 'وَإِنَّني لَأَتَحَرّى فيكِ أَذكُرُهُ', ajuz: 'حَتّى كَأَنّي أَرى ما قَد تَراءَينا' },
    ],
  },
  {
    sourceId: 117,
    titleAr: 'جادك الغيث إذا الغيث همى',
    poetSlug: 'lisan-al-din',
    eraSlug: 'andalusi',
    meterSlug: 'ramal',
    themeSlug: 'ghazal',
    rhymeLetter: 'م',
    poemTypeSlug: 'qasida',
    verses: [
      { sadr: 'جادَكَ الغَيثُ إِذا الغَيثُ هَمى', ajuz: 'يا زَمانَ الوَصلِ بِالأَندَلُسِ' },
      { sadr: 'لَم يَكُن وَصلُكَ إِلّا حُلُما', ajuz: 'في الكَرى أَو خِلسَةَ المُختَلِسِ' },
      { sadr: 'إِذ يَقودُ الدَهرُ أَشتاتَ المُنى', ajuz: 'تَنقُلُ الخَطوَ عَلى ما يُرسَمُ' },
    ],
  },
  {
    sourceId: 118,
    titleAr: 'أمن تذكر جيران بذي سلم',
    poetSlug: 'al-busiri',
    eraSlug: 'ayyubid_mamluk',
    meterSlug: 'basit',
    themeSlug: 'praise',
    rhymeLetter: 'م',
    poemTypeSlug: 'qasida',
    verses: [
      { sadr: 'أَمِن تَذَكُّرِ جيرانٍ بِذي سَلَمِ', ajuz: 'مَزَجتَ دَمعاً جَرى مِن مُقلَةٍ بِدَمِ' },
      { sadr: 'أَم هَبَّتِ الريحُ مِن تِلقاءِ كاظِمَةٍ', ajuz: 'وَأَومَضَ البَرقُ في الظَلماءِ مِن إِضَمِ' },
      { sadr: 'مُحَمَّدٌ سَيِّدُ الكَونَينِ وَالثَقَلَينِ', ajuz: 'وَالفَريقَينِ مِن عُربٍ وَمِن عَجَمِ' },
      { sadr: 'فَاقَ النَبِيّينَ في خَلقٍ وَفي خُلُقٍ', ajuz: 'وَلَم يُدانوهُ في عِلمٍ وَلا كَرَمِ' },
    ],
  },
  {
    sourceId: 119,
    titleAr: 'ريم على القاع بين البان والعلم',
    poetSlug: 'ahmad-shawqi',
    eraSlug: 'modern',
    meterSlug: 'basit',
    themeSlug: 'praise',
    rhymeLetter: 'م',
    poemTypeSlug: 'qasida',
    verses: [
      { sadr: 'ريمٌ عَلى القاعِ بَينَ البانِ وَالعَلَمِ', ajuz: 'أَحَلَّ سَفكَ دَمي في الأَشهُرِ الحُرُمِ' },
      { sadr: 'وُلِدَ الهُدى فَالكائِناتُ ضِياءُ', ajuz: 'وَفَمُ الزَمانِ تَبَسُّمٌ وَثَناءُ' },
      { sadr: 'قُم لِلمُعَلِّمِ وَفِّهِ التَبجيلا', ajuz: 'كادَ المُعَلِّمُ أَن يَكونَ رَسولا' },
      { sadr: 'وَما نَيلُ المَطالِبِ بِالتَمَنّي', ajuz: 'وَلَكِن تُؤخَذُ الدُنيا غِلابا' },
    ],
  },
  {
    sourceId: 120,
    titleAr: 'اختلاف النهار والليل ينسي',
    poetSlug: 'ahmad-shawqi',
    eraSlug: 'modern',
    meterSlug: 'khafif',
    themeSlug: 'patriotism',
    rhymeLetter: 'س',
    poemTypeSlug: 'qasida',
    verses: [
      { sadr: 'اِختِلافُ النَهارِ وَاللَيلِ يُنسي', ajuz: 'اُذكُرا لِيَ الصِبا وَأَيّامَ أُنسي' },
      { sadr: 'وَصِفا لي مُلاوَةً مِن شَبابٍ', ajuz: 'صُوِّرَت مِن تَصَوُّراتٍ وَمَسِّ' },
      { sadr: 'وَسَلا مِصرَ هَل سَلا القَلبُ عَنها', ajuz: 'أَو أَسا جُرحَهُ الزَمانُ المُؤَسّي' },
      { sadr: 'وَطَني لَو شُغِلتُ بِالخُلدِ عَنهُ', ajuz: 'نازَعَتني إِلَيهِ في الخُلدِ نَفسي' },
    ],
  },
  {
    sourceId: 121,
    titleAr: 'رجعت لنفسي فاتهمت حصاتي',
    poetSlug: 'hafiz-ibrahim',
    eraSlug: 'modern',
    meterSlug: 'tawil',
    themeSlug: 'patriotism',
    rhymeLetter: 'ت',
    poemTypeSlug: 'qasida',
    verses: [
      { sadr: 'رَجَعتُ لِنَفسي فَاِتَّهَمتُ حَصاتي', ajuz: 'وَنادَيتُ قَومي فَاِحتَسَبتُ حَياتي' },
      { sadr: 'رَمَوني بِعُقمٍ في الشَبابِ وَلَيتَني', ajuz: 'عَقِمتُ فَلَم أَجزَع لِقَولِ عُداتي' },
      { sadr: 'أَنا البَحرُ في أَحشائِهِ الدُرُّ كامِنٌ', ajuz: 'فَهَل سَأَلوا الغَوّاصَ عَن صَدَفاتي' },
      { sadr: 'وَالأُمُّ مَدرَسَةٌ إِذا أَعدَدتَها', ajuz: 'أَعدَدتَ شَعباً طَيِّبَ الأَعراقِ' },
    ],
  },
  {
    sourceId: 122,
    titleAr: 'قال السماء كئيبة وتجهما',
    poetSlug: 'iliya-abu-madi',
    eraSlug: 'modern',
    meterSlug: 'kamil',
    themeSlug: 'wisdom',
    rhymeLetter: 'م',
    poemTypeSlug: 'qasida',
    verses: [
      { sadr: 'قالَ السَماءُ كَئيبَةٌ وَتَجَهَّما', ajuz: 'قُلتُ اِبتَسِم يَكفي التَجَهُّمُ في السَما' },
      { sadr: 'أَيُّهَذا الشاكي وَما بِكَ داءُ', ajuz: 'كُن جَميلاً تَرَ الوُجودَ جَميلا' },
      { sadr: 'وَالَّذي نَفسُهُ بِغَيرِ جَمالٍ', ajuz: 'لا يَرى في الوُجودِ شَيئاً جَميلا' },
      { sadr: 'نَسِيَ الطينُ ساعَةً أَنَّهُ طينٌ', ajuz: 'حَقيرٌ فَصالَ تيهاً وَعَربَد' },
    ],
  },
];

export const SEED_ACHIEVEMENTS: SeedAchievement[] = [
  {
    code: 'first_round',
    titleAr: 'فاتحة الديوان',
    descriptionAr: 'أكمل أول جولة تحدٍّ في أي وضع من أوضاع اللعب.',
    category: 'بدايات',
    xpBonus: 30,
  },
  {
    code: 'perfect_round',
    titleAr: 'إصابة المحزّ',
    descriptionAr: 'أجب عن جميع أسئلة جولة واحدة إجابة صحيحة بنسبة ١٠٠٪.',
    category: 'دقة',
    xpBonus: 60,
  },
  {
    code: 'streak_3',
    titleAr: 'مواظب القوافي',
    descriptionAr: 'حافظ على سلسلة لعب يومية لمدة ٣ أيام متتالية.',
    category: 'مواظبة',
    xpBonus: 50,
  },
  {
    code: 'streak_7',
    titleAr: 'سمير الأدب',
    descriptionAr: 'حافظ على سلسلة لعب يومية لمدة ٧ أيام متتالية.',
    category: 'مواظبة',
    xpBonus: 120,
  },
  {
    code: 'daily_champion',
    titleAr: 'فارس التحدي اليومي',
    descriptionAr: 'أكمل التحدي اليومي بنجاح للمرة الأولى.',
    category: 'تحديات',
    xpBonus: 45,
  },
  {
    code: 'verses_25',
    titleAr: 'راوية الأبيات',
    descriptionAr: 'أجب إجابة صحيحة عن ٢٥ بيتاً شعرياً.',
    category: 'معرفة',
    xpBonus: 75,
  },
  {
    code: 'verses_100',
    titleAr: 'حافظ الدواوين',
    descriptionAr: 'أجب إجابة صحيحة عن ١٠٠ بيت شعري.',
    category: 'معرفة',
    xpBonus: 200,
  },
  {
    code: 'level_5',
    titleAr: 'أديب البيان',
    descriptionAr: 'ابلغ المستوى الخامس في سلم التقدم.',
    category: 'رتب',
    xpBonus: 100,
  },
];
