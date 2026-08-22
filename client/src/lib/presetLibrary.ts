export interface PresetCategory {
  id: string;
  name: string;
  icon: string;
  badge: string;
  description: string;
  templates: string[];
}

export const PRESET_LIBRARY: PresetCategory[] = [
  {
    id: 'web3-crypto',
    name: 'Web3, Crypto & DeFi Alpha',
    icon: 'Coins',
    badge: 'ENGLISH · CRYPTO',
    description: 'Koleksi komentar natural untuk ekosistem crypto, node runners, testnet, Base, Solana, dan tokenomics.',
    templates: [
      "{the rails are commodity now|infrastructure is solidifying}, {occupying them is the game|distribution is the real moat}. {huge shift happening|loving this development} 🚀",
      "{Solid breakdown|Great thread|Super clear explanation} on the {tokenomics|architecture|mechanics}. {Keep building|Bullish on this|Bookmarked for later}!",
      "{Massive milestone|Big news|Incredible progress} for the ecosystem! {Excited to see where this goes|The team is executing relentlessly} 🔥",
      "{Clean execution|Impressive rollout|Top tier tech}. {Been following this closely|Definitely one of the most promising projects} this cycle 👍",
      "{Underrated alpha|This needs more attention|Bookmarking this immediately}. {Thanks for sharing the insights|Appreciate the alpha drop}!"
    ]
  },
  {
    id: 'ai-agents',
    name: 'AI & Autonomous Agents',
    icon: 'Bot',
    badge: 'ENGLISH · AI AGENTS',
    description: 'Komentar bernas untuk topik LLM, agentic workflows, model inference, AI tooling, dan autonomous systems.',
    templates: [
      "{Agents having native counterparty capabilities|Autonomous agentic workflows} {changes the entire paradigm|is such an underrated unlock}. {Exciting times ahead|Spot on analysis} 🤖",
      "{Inference cost reduction|Open source model progress} is moving at {breakneck speed|an insane pace}. {Great observation|Really well articulated}!",
      "{The transition from tools to autonomous agents|Self-improving loops} is the real {inflection point|game changer}. {Insightful take|Agree 100%} 💡",
      "{Love the focus on pragmatic execution|Clean architecture here}. {Tool calling and memory pipelines|Agentic orchestration} is where the true value lies.",
      "{Very sharp perspective|Couldn't agree more}. {The tooling ecosystem around agents|Model interoperability} is evolving so fast!"
    ]
  },
  {
    id: 'dev-tech',
    name: 'Devs & SaaS Builders',
    icon: 'Code2',
    badge: 'ENGLISH · DEV & SAAS',
    description: 'Komentar untuk para developer, software engineer, tech architecture, dan founder startup.',
    templates: [
      "{Clean design choices|Solid engineering principle|Love this stack architecture}. {Shipping fast without breaking things|Simplicity always wins} ⚡",
      "{Great breakdown of the technical tradeoff|Really appreciate the depth here}. {Bookmarked for reference|Bookmarking this for the team}!",
      "{Building in public and executing consistently|The velocity of your team} is {super inspiring|top tier}. {Rooting for your launch|Keep it up} 🛠️",
      "{Simplicity and developer experience|Fast iteration cycles} always {beat over-engineering|stand the test of time}. {Well said|Spot on}!"
    ]
  },
  {
    id: 'indo-community',
    name: 'Indonesian Tech & Crypto',
    icon: 'MessageCircle',
    badge: 'INDONESIAN · COMMUNITY',
    description: 'Template komentar ramah, apresiatif, dan membumi untuk audiens dan komunitas Indonesia.',
    templates: [
      "{Keren banget|Mantap sekali|Insightful banget} {infonya|pembahasannya|tweetnya} {bang|kak|gan}! 🔥 {Izin bookmark ya|Ditunggu update selanjutnya|Bermanfaat banget}.",
      "{Setuju banget|Sepakat|Benar sekali} dengan poin ini. {Sangat menginspirasi|Membuka wawasan|Top markotop} 👍",
      "{Wah gokil|Menarik banget|Keren nih}, {makasih sudah sharing|makasih infonya ya|semoga makin sukses} {kak|bang|mas}! 🚀",
      "{Penjelasan yang sangat padat dan jelas|Daging semua isinya|Bahasannya selalu berbobot}. {Izin serap ilmunya bang|Sehat dan sukses selalu gan} 🙏"
    ]
  },
  {
    id: 'viral-growth',
    name: 'Viral Hooks & Growth',
    icon: 'Sparkles',
    badge: 'PUNCHY · ENGAGEMENT',
    description: 'Kalimat pendek, padat, dan memancing interaksi untuk memaksimalkan reach dan impression.',
    templates: [
      "{100% agreed|Couldn't have said it better|Pure signal, zero noise}. {This right here|Underrated point} 🎯",
      "{Such an important point that most people overlook|This sums up the whole industry shift}. {Bookmarked|Saved}!",
      "{The execution velocity here is unmatched|Huge respect to the team}. {Watching closely|Excited for what's next} 👀",
      "{Quality insights as always|Always looking forward to your posts}. {Keep dropping these gems|Top tier analysis} 💎"
    ]
  }
];
