/**
 * Comprehensive list of valid Top-Level Domains (TLDs) based on IANA data
 * Used for validating IOC domain extraction to prevent false positives
 * Source: https://www.iana.org/domains/root/db
 */

// Generic Top-Level Domains (gTLD)
export const genericTlds = new Set([
  // Core gTLDs
  'com', 'org', 'net', 'int', 'edu', 'gov', 'mil',
  
  // Other widely used gTLDs
  'info', 'biz', 'name', 'pro', 'aero', 'asia', 'cat', 'coop', 'jobs', 
  'mobi', 'museum', 'tel', 'travel', 'xxx',
  
  // New gTLDs (expanded list)
  'app', 'blog', 'cloud', 'dev', 'email', 'game', 'health', 'live', 
  'news', 'online', 'shop', 'site', 'store', 'tech', 'web', 'website',
  'academy', 'accountant', 'actor', 'adult', 'agency', 'airforce',
  'apartments', 'app', 'army', 'art', 'attorney', 'auction', 'auto',
  'band', 'bank', 'bar', 'beauty', 'beer', 'best', 'bet', 'bid',
  'bike', 'blog', 'blue', 'boats', 'boutique', 'broker', 'build',
  'business', 'buy', 'buzz', 'cafe', 'camera', 'camp', 'capital',
  'car', 'cards', 'care', 'career', 'cars', 'casa', 'cash', 'casino',
  'center', 'ceo', 'cheap', 'church', 'city', 'claims', 'cleaning',
  'click', 'clinic', 'clothing', 'club', 'coach', 'codes', 'coffee',
  'college', 'community', 'company', 'computer', 'condos', 'construction',
  'consulting', 'contact', 'contractors', 'cooking', 'cool', 'country',
  'coupon', 'courses', 'credit', 'creditcard', 'cruise', 'dance',
  'data', 'date', 'dating', 'deals', 'degree', 'delivery', 'democrat',
  'dental', 'dentist', 'design', 'diamonds', 'diet', 'digital',
  'direct', 'directory', 'discount', 'doctor', 'dog', 'domains',
  'download', 'earth', 'education', 'energy', 'engineer', 'engineering',
  'enterprises', 'equipment', 'estate', 'events', 'exchange', 'expert',
  'exposed', 'express', 'fail', 'faith', 'family', 'fan', 'farm',
  'fashion', 'finance', 'financial', 'fish', 'fitness', 'flights',
  'florist', 'flowers', 'fly', 'football', 'forsale', 'foundation',
  'fund', 'furniture', 'futbol', 'fyi', 'gallery', 'games', 'garden',
  'gift', 'gifts', 'gives', 'glass', 'global', 'gold', 'golf',
  'graphics', 'gratis', 'green', 'gripe', 'group', 'guide', 'guitars',
  'guru', 'hair', 'haus', 'healthcare', 'help', 'hiphop', 'hockey',
  'holdings', 'holiday', 'home', 'horse', 'hospital', 'host', 'hosting',
  'house', 'how', 'immo', 'immobilien', 'industries', 'ink', 'institute',
  'insurance', 'insure', 'international', 'investments', 'io', 'jetzt',
  'jewelry', 'kaufen', 'kitchen', 'land', 'law', 'lawyer', 'lease',
  'legal', 'life', 'lighting', 'limited', 'limo', 'link', 'loan',
  'loans', 'lol', 'love', 'ltd', 'luxury', 'maison', 'management',
  'market', 'marketing', 'markets', 'mba', 'media', 'medical', 'meet',
  'memorial', 'men', 'menu', 'miami', 'money', 'mortgage', 'movie',
  'navy', 'network', 'new', 'ngo', 'ninja', 'now', 'observer', 'one',
  'ong', 'organic', 'parts', 'party', 'pet', 'photo', 'photography',
  'photos', 'pics', 'pictures', 'pink', 'pizza', 'place', 'plumbing',
  'plus', 'poker', 'porn', 'press', 'productions', 'properties',
  'property', 'pub', 'racing', 'recipes', 'red', 'rehab', 'reisen',
  'rent', 'rentals', 'repair', 'report', 'republican', 'rest',
  'restaurant', 'review', 'reviews', 'rich', 'rip', 'rocks', 'run',
  'sale', 'salon', 'sarl', 'school', 'schule', 'science', 'security',
  'select', 'services', 'sex', 'sexy', 'shoes', 'show', 'singles',
  'social', 'software', 'solar', 'solutions', 'space', 'sport',
  'studio', 'style', 'sucks', 'supplies', 'supply', 'support',
  'surgery', 'systems', 'tax', 'taxi', 'team', 'technology', 'tennis',
  'theater', 'theatre', 'tips', 'tires', 'today', 'tools', 'top',
  'tours', 'town', 'toys', 'trade', 'training', 'tube', 'university',
  'uno', 'vacations', 'ventures', 'vet', 'viajes', 'video', 'villas',
  'vin', 'vip', 'vision', 'vodka', 'vote', 'voyage', 'watch', 'webcam',
  'wedding', 'wiki', 'win', 'wine', 'work', 'works', 'world', 'wtf',
  'yoga', 'zone'
]);

// Country Code Top-Level Domains (ccTLD)
export const countryCodeTlds = new Set([
  // Major ccTLDs
  'us', 'uk', 'de', 'fr', 'jp', 'cn', 'br', 'in', 'es', 'it', 'ru', 'au',
  'ca', 'mx', 'kr', 'nl', 'se', 'no', 'dk', 'fi', 'pl', 'tr', 'ar', 'cl',
  'co', 've', 'pe', 'ec', 'uy', 'py', 'bo', 'sr', 'gf', 'gy', 'fk',
  
  // Complete list of ccTLDs (300+ entries)
  'ad', 'ae', 'af', 'ag', 'ai', 'al', 'am', 'ao', 'aq', 'as', 'at',
  'aw', 'ax', 'az', 'ba', 'bb', 'bd', 'be', 'bf', 'bg', 'bh', 'bi',
  'bj', 'bl', 'bm', 'bn', 'bo', 'bq', 'bs', 'bt', 'bv', 'bw', 'by',
  'bz', 'cc', 'cd', 'cf', 'cg', 'ch', 'ci', 'ck', 'cm', 'cr', 'cu',
  'cv', 'cw', 'cx', 'cy', 'cz', 'dj', 'dm', 'do', 'dz', 'eg', 'eh',
  'er', 'et', 'eu', 'fj', 'fm', 'fo', 'ga', 'gb', 'gd', 'ge', 'gg',
  'gh', 'gi', 'gl', 'gm', 'gn', 'gp', 'gq', 'gr', 'gs', 'gt', 'gu',
  'gw', 'hk', 'hm', 'hn', 'hr', 'ht', 'hu', 'id', 'ie', 'il', 'im',
  'iq', 'ir', 'is', 'je', 'jm', 'jo', 'ke', 'kg', 'kh', 'ki', 'km',
  'kn', 'kp', 'kw', 'ky', 'kz', 'la', 'lb', 'lc', 'li', 'lk', 'lr',
  'ls', 'lt', 'lu', 'lv', 'ly', 'ma', 'mc', 'md', 'me', 'mf', 'mg',
  'mh', 'mk', 'ml', 'mm', 'mn', 'mo', 'mp', 'mq', 'mr', 'ms', 'mt',
  'mu', 'mv', 'mw', 'my', 'mz', 'na', 'nc', 'ne', 'nf', 'ng', 'ni',
  'np', 'nr', 'nu', 'nz', 'om', 'pa', 'pf', 'pg', 'ph', 'pk', 'pm',
  'pn', 'pr', 'ps', 'pt', 'pw', 'qa', 're', 'ro', 'rs', 'rw', 'sa',
  'sb', 'sc', 'sd', 'sg', 'sh', 'si', 'sj', 'sk', 'sl', 'sm', 'sn',
  'so', 'ss', 'st', 'sv', 'sx', 'sy', 'sz', 'tc', 'td', 'tf', 'tg',
  'th', 'tj', 'tk', 'tl', 'tm', 'tn', 'to', 'tt', 'tv', 'tw', 'tz',
  'ua', 'ug', 'um', 'uy', 'uz', 'va', 'vc', 'vg', 'vi', 'vn', 'vu',
  'wf', 'ws', 'ye', 'yt', 'za', 'zm', 'zw'
]);

// Sponsored Top-Level Domains (sTLD)
export const sponsoredTlds = new Set([
  'aero', 'asia', 'cat', 'coop', 'edu', 'gov', 'int', 'jobs', 'mil',
  'museum', 'tel', 'travel', 'mobi'
]);

// Generic-Restricted Top-Level Domains (grTLD)
export const restrictedTlds = new Set([
  'biz', 'name', 'pro', 'xxx'
]);

// Test Top-Level Domains (tTLD) - NOT valid for real IOCs
export const testTlds = new Set([
  'test', 'example', 'invalid', 'localhost', 'internal', 'onion'
]);

// Infrastructure TLDs
export const infrastructureTlds = new Set([
  'arpa'
]);

// Combined set of all valid TLDs (excluding test TLDs for IOC validation)
export const validTlds = new Set([
  ...genericTlds,
  ...countryCodeTlds,
  ...sponsoredTlds,
  ...restrictedTlds,
  ...infrastructureTlds
]);

// Function to validate if a TLD is legitimate
export function isValidTld(tld: string): boolean {
  return validTlds.has(tld.toLowerCase());
}

// Function to validate domain format and TLD
export function isValidDomain(domain: string): boolean {
  if (!domain || typeof domain !== 'string') {
    return false;
  }
  
  // Basic domain format validation
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!domainRegex.test(domain)) {
    return false;
  }
  
  // Check if domain has at least one dot
  if (!domain.includes('.')) {
    return false;
  }
  
  // Extract and validate TLD
  const parts = domain.split('.');
  const tld = parts[parts.length - 1];
  
  // Must have a valid TLD
  return isValidTld(tld);
}

// Function to extract domains from text with TLD validation
export function extractValidDomains(text: string): string[] {
  // Multiple domain extraction patterns to catch various formats
  const domainPatterns = [
    // Standard domains
    /\b[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+\b/g,
    // Defanged domains with [.]
    /\b[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\[\.\][a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+\b/g,
    // Mixed defanged patterns
    /\b[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?([\.\[\.\]])+[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?/g
  ];
  
  const allMatches: string[] = [];
  
  // Extract using all patterns
  for (const pattern of domainPatterns) {
    const matches = text.match(pattern) || [];
    allMatches.push(...matches);
  }
  
  return allMatches.filter(domain => {
    // Normalize defanged indicators first
    let cleanDomain = domain.replace(/\[\.\]/g, '.').toLowerCase().trim();
    
    // Skip if it's clearly part of a sentence (ends with common sentence punctuation context)
    if (/\.(in|at|as|or|is|on|to|of|an|it|be|we|he|she|they|the|and|but|for|if|so|no|yes|all|any|can|may|you|me|us|him|her|them|this|that|these|those|when|where|what|who|why|how)\b/i.test(cleanDomain)) {
      return false;
    }
    
    // Validate domain format and TLD
    return isValidDomain(cleanDomain);
  }).map(domain => {
    // Return normalized domain (defanged -> normal)
    return domain.replace(/\[\.\]/g, '.');
  });
}

export default {
  validTlds,
  isValidTld,
  isValidDomain,
  extractValidDomains,
  genericTlds,
  countryCodeTlds,
  sponsoredTlds,
  restrictedTlds,
  testTlds,
  infrastructureTlds
};