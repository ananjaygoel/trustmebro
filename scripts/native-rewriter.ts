/**
 * Native GenZ Rephraser - No AI APIs needed
 * Fast, free, unlimited rewrites
 */

// ============ GENZ VOCABULARY TRANSFORMATIONS ============
const WORD_SWAPS: [RegExp, string][] = [
  // Intensifiers
  [/\bvery\b/gi, 'lowkey'],
  [/\breally\b/gi, 'fr'],
  [/\bextremely\b/gi, 'deadass'],
  [/\bincredibly\b/gi, 'insanely'],
  [/\bsignificantly\b/gi, 'majorly'],
  
  // Positive reactions
  [/\bexcellent\b/gi, 'fire'],
  [/\bgreat\b/gi, 'solid'],
  [/\bamazing\b/gi, 'insane'],
  [/\bimpressive\b/gi, 'wild'],
  [/\boutstanding\b/gi, 'elite'],
  [/\bfantastic\b/gi, 'bussin'],
  [/\bwonderful\b/gi, 'iconic'],
  [/\bbeautiful\b/gi, 'clean'],
  [/\bperfect\b/gi, 'immaculate'],
  
  // Negative reactions
  [/\bterrible\b/gi, 'trash'],
  [/\bawful\b/gi, 'mid'],
  [/\bbad\b/gi, 'rough'],
  [/\bpoor\b/gi, 'weak'],
  [/\bdisappointing\b/gi, 'not it'],
  [/\bunfortunate\b/gi, 'yikes'],
  
  // Actions
  [/\bsaid\b/gi, 'dropped'],
  [/\bannounced\b/gi, 'just dropped'],
  [/\brevealed\b/gi, 'spilled'],
  [/\bexplained\b/gi, 'broke down'],
  [/\bdiscovered\b/gi, 'found out'],
  [/\breleased\b/gi, 'dropped'],
  [/\blaunched\b/gi, 'shipped'],
  [/\bstarted\b/gi, 'kicked off'],
  [/\bended\b/gi, 'wrapped up'],
  [/\bfailed\b/gi, 'flopped'],
  [/\bsucceeded\b/gi, 'cooked'],
  [/\bwon\b/gi, 'clutched'],
  [/\blost\b/gi, 'took an L'],
  [/\bdefeated\b/gi, 'demolished'],
  [/\bcriticized\b/gi, 'called out'],
  [/\bsupported\b/gi, 'backed'],
  [/\bdenied\b/gi, 'shut down'],
  [/\bconfirmed\b/gi, 'locked in'],
  
  // People/entities
  [/\bcompany\b/gi, 'company'],
  [/\bcompanies\b/gi, 'companies'],
  [/\bexperts\b/gi, 'the experts'],
  [/\banalysts\b/gi, 'analysts'],
  [/\bcritics\b/gi, 'haters'],
  [/\bsupporters\b/gi, 'stans'],
  [/\bfans\b/gi, 'the fandom'],
  [/\bcustomers\b/gi, 'users'],
  [/\bconsumers\b/gi, 'people'],
  
  // Tech terms
  [/\bartificial intelligence\b/gi, 'AI'],
  [/\bmachine learning\b/gi, 'ML'],
  [/\bsoftware\b/gi, 'software'],
  [/\bapplication\b/gi, 'app'],
  [/\bsmartphone\b/gi, 'phone'],
  [/\binternet\b/gi, 'the internet'],
  [/\bwebsite\b/gi, 'site'],
  [/\bsocial media\b/gi, 'socials'],
  
  // Business terms
  [/\brevenue\b/gi, 'revenue'],
  [/\bprofits\b/gi, 'profits'],
  [/\bstock price\b/gi, 'stock'],
  [/\binvestors\b/gi, 'investors'],
  [/\bstakeholders\b/gi, 'everyone involved'],
  [/\bsynergy\b/gi, 'teamwork'],
  [/\bleverage\b/gi, 'use'],
  [/\bpivot\b/gi, 'switch up'],
  [/\bscale\b/gi, 'grow'],
  
  // Time expressions
  [/\brecently\b/gi, 'just'],
  [/\bpreviously\b/gi, 'before'],
  [/\bcurrently\b/gi, 'rn'],
  [/\bimmediately\b/gi, 'ASAP'],
  [/\beventually\b/gi, 'at some point'],
  [/\bsoon\b/gi, 'soon'],
  
  // Connectors
  [/\bhowever\b/gi, 'but'],
  [/\btherefore\b/gi, 'so'],
  [/\bfurthermore\b/gi, 'plus'],
  [/\bmoreover\b/gi, 'also'],
  [/\bnevertheless\b/gi, 'still'],
  [/\bconsequently\b/gi, 'so basically'],
  [/\badditionally\b/gi, 'and'],
  [/\bin addition\b/gi, 'plus'],
  [/\bas a result\b/gi, 'so'],
  [/\bdue to\b/gi, 'because of'],
  [/\bin order to\b/gi, 'to'],
  [/\bwith regard to\b/gi, 'about'],
  [/\bin terms of\b/gi, 'for'],
];

// Phrases to add GenZ flavor
const OPENER_PHRASES = [
  "Okay so",
  "Alright so",
  "So basically",
  "Here's the thing:",
  "Real talk:",
  "Not gonna lie,",
  "Listen up:",
  "So get this:",
  "Breaking it down:",
  "Let's talk about",
];

const REACTION_INSERTS = [
  "(and honestly, same)",
  "(wild, right?)",
  "(we're not making this up)",
  "(let that sink in)",
  "(yes, really)",
  "(shocking, we know)",
  "(it's giving chaos)",
  "(plot twist fr)",
];

const CLOSING_QUESTIONS = [
  "What do you think about all this?",
  "Are you here for this or nah?",
  "Thoughts? Drop them below.",
  "Is this a W or an L? You decide.",
  "What's your take on this whole situation?",
  "How do you feel about this development?",
  "Sound off in the comments.",
  "We want to hear your thoughts on this.",
];

// Category-specific context expanders for thin content
const CATEGORY_CONTEXT: Record<string, string[]> = {
  tech: [
    "This is part of the broader shift happening across the tech industry right now.",
    "Tech companies have been making moves like this as competition heats up.",
    "This could have major implications for how we use technology going forward.",
  ],
  ai: [
    "The AI space continues to evolve at a wild pace, with developments like this becoming more common.",
    "As AI capabilities expand, we're seeing more announcements like this reshape the industry.",
    "This adds to the ongoing AI race that's captivating the tech world.",
  ],
  gaming: [
    "The gaming community has been watching developments like this closely.",
    "This is the kind of news that gets gamers talking across social media.",
    "Gaming fans have strong opinions about moves like this, and for good reason.",
  ],
  business: [
    "This reflects broader trends we're seeing in the business world right now.",
    "Market watchers are paying close attention to developments like this.",
    "The business implications here could be significant in the coming months.",
  ],
  entertainment: [
    "Entertainment industry insiders have been buzzing about this.",
    "This is exactly the kind of news that gets fans excited or concerned.",
    "The entertainment world moves fast, and this is a prime example.",
  ],
  sports: [
    "Sports fans across the globe are reacting to this news.",
    "This could change the dynamics of the sport going forward.",
    "The sports world never stops delivering these kinds of storylines.",
    "Players and coaches will be watching how this unfolds closely.",
    "This is the kind of move that can define a season.",
    "Sports analysts are already debating what this means for the competition.",
  ],
  science: [
    "Scientists and researchers are watching this development closely.",
    "This could have implications for future research in this area.",
    "The scientific community tends to find developments like this significant.",
  ],
  health: [
    "Health experts are weighing in on what this means for people.",
    "This is the kind of health news that affects everyday decisions.",
    "Medical professionals are taking note of this development.",
  ],
  world: [
    "This is part of the larger geopolitical picture unfolding right now.",
    "International observers are watching how this situation develops.",
    "Global events like this tend to have ripple effects worldwide.",
    "Diplomats and experts are analyzing what this means for international relations.",
    "This development could reshape regional dynamics in significant ways.",
    "World leaders are expected to respond to this situation soon.",
  ],
  viral: [
    "The internet is doing what it does best - making this blow up everywhere.",
    "Social media has been going wild over this, as expected.",
    "This is exactly the kind of content that captures the internet's attention.",
    "People online are sharing their takes and it's getting heated.",
    "This story is spreading fast across all platforms.",
    "The viral nature of this story shows how quickly things can blow up these days.",
  ],
};

// ============ TITLE GENERATION ============
function generateTitle(originalTitle: string): string {
  let title = originalTitle;
  
  // Apply word swaps
  for (const [pattern, replacement] of WORD_SWAPS) {
    title = title.replace(pattern, replacement);
  }
  
  // Keep it under 60 chars
  if (title.length > 60) {
    title = title.substring(0, 57) + '...';
  }
  
  return title;
}

// ============ EXCERPT GENERATION ============
function generateExcerpt(sourceContent: string, title: string): string {
  // Clean HTML first
  const cleanSource = sourceContent
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/href="[^"]*"/gi, '')
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Get first real sentence from source (not from formatted content)
  const sentences = cleanSource.match(/[^.!?]+[.!?]+/g) || [];
  let firstSentence = applyWordSwaps(sentences[0]?.trim() || '');
  
  if (firstSentence.length > 140) {
    return firstSentence.substring(0, 137) + '...';
  }
  
  // If too short, add more
  if (firstSentence.length < 80 && sentences[1]) {
    const combined = firstSentence + ' ' + applyWordSwaps(sentences[1].trim());
    if (combined.length <= 140) {
      return combined;
    }
  }
  
  if (firstSentence.length < 60) {
    return `${firstSentence} Here's what you need to know.`;
  }
  
  return firstSentence;
}

// ============ CONTENT REWRITING ============
function rewriteContent(originalContent: string, title: string, category: string = 'tech'): string {
  // Clean up the content first - remove noise and HTML
  let cleanContent = originalContent
    // Strip HTML tags and attributes
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/href="[^"]*"/gi, '')
    .replace(/src="[^"]*"/gi, '')
    // Remove broken URLs and image references
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/\.[a-z]{3,4}\?[^\s]*/gi, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\d+\s*per\s*1M/gi, '') // Remove pricing noise
    .replace(/\$\d+\.\s*\d+/g, (m) => m.replace(/\s+/g, '')) // Fix broken prices like "$0. 50"
    .trim();
  
  // If content is too broken (mostly junk), use title as base
  if (cleanContent.length < 50 || cleanContent.split(' ').length < 10) {
    cleanContent = `${title}. This news is making waves across social media and news outlets.`;
  }
  
  // Split by sentence for better control
  const sentences = cleanContent
    .match(/[^.!?]+[.!?]+/g) || [];
  
  // Filter out very short, noisy, or duplicate sentences
  const seenSentences = new Set<string>();
  const goodSentences = sentences
    .map(s => s.trim())
    .filter(s => {
      // Skip short, noisy, or duplicate sentences
      if (s.length < 30 || s.match(/^\d+$/) || s.match(/^vs\.?$/i)) return false;
      // Normalize for duplicate detection
      const normalized = s.toLowerCase().replace(/\s+/g, ' ').slice(0, 50);
      if (seenSentences.has(normalized)) return false;
      seenSentences.add(normalized);
      return true;
    });
  
  // Get category-specific context for expanding thin content
  const categoryContexts = CATEGORY_CONTEXT[category] || CATEGORY_CONTEXT['tech'];
  const getRandomContext = () => categoryContexts[Math.floor(Math.random() * categoryContexts.length)];
  
  const sections: string[] = [];
  
  // What's Happening section
  sections.push("## What's Happening\n");
  
  const opener = OPENER_PHRASES[Math.floor(Math.random() * OPENER_PHRASES.length)];
  
  if (goodSentences.length === 0) {
    // Fallback for very short content - use title
    sections.push(`${opener} ${applyWordSwaps(title)}. This is making waves across the industry.\n`);
    sections.push("The details are still emerging, but here's what we know so far.\n");
  } else if (goodSentences.length === 1) {
    sections.push(`${opener} ${applyWordSwaps(goodSentences[0])}\n`);
    sections.push("More details are expected to emerge soon.\n");
  } else {
    const firstPara = applyWordSwaps(goodSentences[0]);
    sections.push(`${opener} ${firstPara}\n`);
    
    if (goodSentences.length > 1) {
      let secondPara = applyWordSwaps(goodSentences[1]);
      if (Math.random() > 0.5) {
        const reaction = REACTION_INSERTS[Math.floor(Math.random() * REACTION_INSERTS.length)];
        secondPara = `${secondPara} ${reaction}`;
      }
      sections.push(secondPara + "\n");
    }
  }
  
  // Why This Matters section
  sections.push("\n## Why This Matters\n");
  
  if (goodSentences.length > 2) {
    const mattersPara = goodSentences.slice(2, 4).map(s => applyWordSwaps(s)).join(' ');
    sections.push(mattersPara + "\n");
    // Add category context if content is thin
    if (goodSentences.length < 5) {
      sections.push(getRandomContext() + "\n");
    }
  } else {
    // Use TWO DIFFERENT category-specific contexts for thin content
    const context1 = getRandomContext();
    let context2 = getRandomContext();
    // Make sure we don't repeat the same context
    let attempts = 0;
    while (context2 === context1 && attempts < 3) {
      context2 = getRandomContext();
      attempts++;
    }
    sections.push(`${context1} ${context2}\n`);
  }
  
  // Add bullet points for remaining key facts
  if (goodSentences.length > 4) {
    const bullets = goodSentences.slice(4, 7)
      .map(s => applyWordSwaps(s))
      .filter(s => s.length > 25 && s.length < 150);
    if (bullets.length > 0) {
      sections.push("\nKey takeaways:\n");
      bullets.forEach(bullet => {
        sections.push(`- ${bullet}`);
      });
      sections.push("");
    }
  }
  
  // The Bottom Line section
  sections.push("\n## The Bottom Line\n");
  
  const closingQuestion = CLOSING_QUESTIONS[Math.floor(Math.random() * CLOSING_QUESTIONS.length)];
  
  if (sentences.length > 10) {
    const lastSentences = sentences.slice(-2).map(s => applyWordSwaps(s.trim())).join(' ');
    sections.push(`${lastSentences} ${closingQuestion}`);
  } else {
    sections.push(`This story is still developing, and we'll keep you updated. ${closingQuestion}`);
  }
  
  return sections.join('\n');
}

// Capitalize first letter of a string
function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Apply word swaps to text
function applyWordSwaps(text: string): string {
  let result = text;
  
  for (const [pattern, replacement] of WORD_SWAPS) {
    result = result.replace(pattern, replacement);
  }
  
  // Clean up any double spaces
  result = result.replace(/\s+/g, ' ').trim();
  
  // Ensure sentences start with capital letters
  result = result.replace(/([.!?]\s+)([a-z])/g, (_, punct, letter) => punct + letter.toUpperCase());
  
  // Capitalize first letter
  result = capitalize(result);
  
  return result;
}

// Extract key facts as bullet points
function extractKeyFacts(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const facts: string[] = [];
  
  for (const sentence of sentences.slice(0, 4)) {
    const cleaned = sentence.trim();
    if (cleaned.length > 30 && cleaned.length < 150) {
      facts.push(applyWordSwaps(cleaned));
    }
  }
  
  return facts.slice(0, 3); // Max 3 bullets
}

// ============ MAIN REWRITE FUNCTION ============
export interface RewriteInput {
  title: string;
  description: string;
  content?: string;
  category?: string;
}

export interface RewriteOutput {
  title: string;
  excerpt: string;
  content: string;
}

export function nativeRewrite(article: RewriteInput): RewriteOutput {
  const sourceContent = `${article.description} ${article.content || ''}`.trim();
  const category = article.category || 'tech';
  
  const title = generateTitle(article.title);
  const content = rewriteContent(sourceContent, title, category);
  const excerpt = generateExcerpt(sourceContent, title);
  
  return {
    title,
    excerpt,
    content,
  };
}


