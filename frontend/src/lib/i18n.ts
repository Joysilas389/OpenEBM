export type Lang =
  | 'en' | 'fr' | 'es' | 'ar' | 'pt'
  | 'de' | 'it' | 'zh' | 'hi' | 'sw'
  | 'ru' | 'ja' | 'tr' | 'id' | 'nl';

export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: 'en', label: 'English',     flag: '🇺🇸' },
  { code: 'fr', label: 'Français',    flag: '🇫🇷' },
  { code: 'es', label: 'Español',     flag: '🇪🇸' },
  { code: 'pt', label: 'Português',   flag: '🇵🇹' },
  { code: 'de', label: 'Deutsch',     flag: '🇩🇪' },
  { code: 'it', label: 'Italiano',    flag: '🇮🇹' },
  { code: 'nl', label: 'Nederlands',  flag: '🇳🇱' },
  { code: 'ru', label: 'Русский',     flag: '🇷🇺' },
  { code: 'tr', label: 'Türkçe',      flag: '🇹🇷' },
  { code: 'ar', label: 'العربية',     flag: '🇸🇦' },
  { code: 'zh', label: '中文',         flag: '🇨🇳' },
  { code: 'ja', label: '日本語',       flag: '🇯🇵' },
  { code: 'hi', label: 'हिन्दी',       flag: '🇮🇳' },
  { code: 'id', label: 'Indonesia',   flag: '🇮🇩' },
  { code: 'sw', label: 'Kiswahili',   flag: '🇰🇪' },
];

type Dict = Record<string, string>;

const en: Dict = {
  app_name: 'openEBM',
  tagline: 'Evidence-based medicine, powered by Claude',
  ask_placeholder: 'Ask a clinical question…',
  send: 'Send', search: 'Search', compare: 'Compare',
  history: 'History', saved: 'Saved', more: 'More',
  settings: 'Settings', simulations: 'Simulations', about: 'About',
  references: 'References', related_questions: 'Related questions',
  warnings: 'Important notes', open_source: 'Open source',
  why_cited: 'Why this source', thinking: 'Searching evidence…',
  verifying: 'Verifying citations…',
  no_history: 'No history yet. Ask a question to get started.',
  no_bookmarks: 'No saved answers yet.',
  clear_all: 'Clear all', delete: 'Delete', rename: 'Rename',
  pin: 'Pin', bookmark: 'Save', unbookmark: 'Unsave', examples: 'Try',
  teaching_mode: 'Teaching mode', appearance: 'Appearance',
  dark: 'Dark', light: 'Light', system: 'System',
  language: 'Language', answer_language: 'Answer language',
  answer_style: 'Answer style', concise: 'Concise',
  standard: 'Standard', deep: 'Deep',
  citation_density: 'Citation density', high: 'High', very_high: 'Very high',
  answer_length: 'Answer length', max_references: 'Max references',
  source_preference: 'Source preference', freshness: 'Freshness',
  include_basic_sciences: 'Include basic sciences', specialty: 'Specialty',
  data_controls: 'Data controls', reset_settings: 'Reset settings',
  not_substitute: 'openEBM is decision support — not a substitute for clinician judgment.',
  insufficient_evidence: 'Limited high-confidence evidence found',
  candidates_considered: 'candidates considered',
  references_displayed: 'verified references',
};

const fr: Dict = { ...en,
  tagline: 'Médecine fondée sur les preuves, propulsée par Claude',
  ask_placeholder: 'Posez une question clinique…',
  send: 'Envoyer', search: 'Recherche', compare: 'Comparer',
  history: 'Historique', saved: 'Enregistrés', more: 'Plus',
  settings: 'Paramètres', references: 'Références',
  related_questions: 'Questions liées', thinking: 'Recherche des preuves…',
  not_substitute: "openEBM est une aide à la décision — pas un substitut au jugement clinique.",
};

const es: Dict = { ...en,
  tagline: 'Medicina basada en evidencia, impulsada por Claude',
  ask_placeholder: 'Haz una pregunta clínica…',
  send: 'Enviar', search: 'Buscar', compare: 'Comparar',
  history: 'Historial', saved: 'Guardados', more: 'Más',
  settings: 'Ajustes', references: 'Referencias',
  related_questions: 'Preguntas relacionadas', thinking: 'Buscando evidencia…',
  not_substitute: 'openEBM es apoyo a la decisión — no sustituye el juicio clínico.',
};

const pt: Dict = { ...en,
  tagline: 'Medicina baseada em evidências, com Claude',
  ask_placeholder: 'Faça uma pergunta clínica…',
  send: 'Enviar', search: 'Buscar', compare: 'Comparar',
  history: 'Histórico', saved: 'Salvos', more: 'Mais',
  settings: 'Configurações', references: 'Referências',
  related_questions: 'Perguntas relacionadas', thinking: 'Buscando evidências…',
  not_substitute: 'openEBM é apoio à decisão — não substitui o julgamento clínico.',
};

const de: Dict = { ...en,
  tagline: 'Evidenzbasierte Medizin, angetrieben von Claude',
  ask_placeholder: 'Stellen Sie eine klinische Frage…',
  send: 'Senden', search: 'Suche', compare: 'Vergleichen',
  history: 'Verlauf', saved: 'Gespeichert', more: 'Mehr',
  settings: 'Einstellungen', references: 'Quellen',
  related_questions: 'Verwandte Fragen', thinking: 'Evidenz wird gesucht…',
  not_substitute: 'openEBM ist Entscheidungshilfe — kein Ersatz für klinisches Urteilsvermögen.',
};

const it: Dict = { ...en,
  tagline: 'Medicina basata sulle evidenze, con Claude',
  ask_placeholder: 'Fai una domanda clinica…',
  send: 'Invia', search: 'Cerca', compare: 'Confronta',
  history: 'Cronologia', saved: 'Salvati', more: 'Altro',
  settings: 'Impostazioni', references: 'Riferimenti',
  related_questions: 'Domande correlate', thinking: 'Ricerca evidenze…',
  not_substitute: 'openEBM è supporto decisionale — non sostituisce il giudizio clinico.',
};

const nl: Dict = { ...en,
  tagline: 'Evidence-based geneeskunde, mogelijk gemaakt door Claude',
  ask_placeholder: 'Stel een klinische vraag…',
  send: 'Verzenden', search: 'Zoeken', compare: 'Vergelijken',
  history: 'Geschiedenis', saved: 'Opgeslagen', more: 'Meer',
  settings: 'Instellingen', references: 'Referenties',
  related_questions: 'Gerelateerde vragen', thinking: 'Bewijs zoeken…',
  not_substitute: 'openEBM is beslissingsondersteuning — geen vervanging voor klinisch oordeel.',
};

const ru: Dict = { ...en,
  tagline: 'Доказательная медицина на базе Claude',
  ask_placeholder: 'Задайте клинический вопрос…',
  send: 'Отправить', search: 'Поиск', compare: 'Сравнить',
  history: 'История', saved: 'Сохранённые', more: 'Ещё',
  settings: 'Настройки', references: 'Источники',
  related_questions: 'Связанные вопросы', thinking: 'Поиск доказательств…',
  not_substitute: 'openEBM — поддержка принятия решений, не замена клинического суждения.',
};

const tr: Dict = { ...en,
  tagline: 'Kanıta dayalı tıp, Claude tarafından desteklenmektedir',
  ask_placeholder: 'Klinik bir soru sorun…',
  send: 'Gönder', search: 'Ara', compare: 'Karşılaştır',
  history: 'Geçmiş', saved: 'Kaydedilenler', more: 'Daha fazla',
  settings: 'Ayarlar', references: 'Kaynaklar',
  related_questions: 'İlgili sorular', thinking: 'Kanıtlar aranıyor…',
  not_substitute: 'openEBM karar desteğidir — klinik muhakemenin yerini tutmaz.',
};

const ar: Dict = { ...en,
  tagline: 'الطب القائم على الأدلة، مدعوم بـ Claude',
  ask_placeholder: 'اطرح سؤالاً سريرياً…',
  send: 'إرسال', search: 'بحث', compare: 'مقارنة',
  history: 'السجل', saved: 'المحفوظة', more: 'المزيد',
  settings: 'الإعدادات', references: 'المراجع',
  related_questions: 'أسئلة ذات صلة', thinking: 'جارٍ البحث في الأدلة…',
  not_substitute: 'openEBM أداة دعم قرار — وليس بديلاً عن الحكم السريري.',
};

const zh: Dict = { ...en,
  tagline: '由 Claude 驱动的循证医学',
  ask_placeholder: '提出临床问题…',
  send: '发送', search: '搜索', compare: '比较',
  history: '历史', saved: '收藏', more: '更多',
  settings: '设置', references: '参考文献',
  related_questions: '相关问题', thinking: '正在检索证据…',
  not_substitute: 'openEBM 仅为决策辅助 — 不能替代临床判断。',
};

const ja: Dict = { ...en,
  tagline: 'Claude による根拠に基づく医療',
  ask_placeholder: '臨床的な質問を入力…',
  send: '送信', search: '検索', compare: '比較',
  history: '履歴', saved: '保存済み', more: 'その他',
  settings: '設定', references: '参考文献',
  related_questions: '関連する質問', thinking: 'エビデンスを検索中…',
  not_substitute: 'openEBM は意思決定支援であり、臨床判断の代わりにはなりません。',
};

const hi: Dict = { ...en,
  tagline: 'Claude द्वारा संचालित साक्ष्य-आधारित चिकित्सा',
  ask_placeholder: 'एक नैदानिक प्रश्न पूछें…',
  send: 'भेजें', search: 'खोज', compare: 'तुलना',
  history: 'इतिहास', saved: 'सहेजे गए', more: 'और',
  settings: 'सेटिंग्स', references: 'संदर्भ',
  related_questions: 'संबंधित प्रश्न', thinking: 'साक्ष्य खोजे जा रहे हैं…',
  not_substitute: 'openEBM निर्णय सहायता है — नैदानिक निर्णय का विकल्प नहीं।',
};

const id_: Dict = { ...en,
  tagline: 'Kedokteran berbasis bukti, didukung Claude',
  ask_placeholder: 'Ajukan pertanyaan klinis…',
  send: 'Kirim', search: 'Cari', compare: 'Bandingkan',
  history: 'Riwayat', saved: 'Disimpan', more: 'Lainnya',
  settings: 'Pengaturan', references: 'Referensi',
  related_questions: 'Pertanyaan terkait', thinking: 'Mencari bukti…',
  not_substitute: 'openEBM adalah dukungan keputusan — bukan pengganti penilaian klinis.',
};

const sw: Dict = { ...en,
  tagline: 'Tiba inayotegemea ushahidi, kwa msaada wa Claude',
  ask_placeholder: 'Uliza swali la kimatibabu…',
  send: 'Tuma', search: 'Tafuta', compare: 'Linganisha',
  history: 'Historia', saved: 'Zilizohifadhiwa', more: 'Zaidi',
  settings: 'Mipangilio', references: 'Marejeleo',
  related_questions: 'Maswali yanayohusiana', thinking: 'Inatafuta ushahidi…',
  not_substitute: 'openEBM ni msaada wa maamuzi — si mbadala wa hukumu ya kitabibu.',
};

const dicts: Record<Lang, Dict> = {
  en, fr, es, pt, de, it, nl, ru, tr, ar, zh, ja, hi, id: id_, sw,
};

export function t(key: string, lang: Lang = 'en'): string {
  return dicts[lang]?.[key] ?? en[key] ?? key;
}

export function isRTL(lang: Lang): boolean {
  return lang === 'ar';
}
