// Debug script to test IOC extraction and find issues

// Test text that should demonstrate the problem
const testText = `
Analyzing the malware behavior, we noticed that the payload.In this blog post we are covering 
the attack.At various stages of the campaign. The threat actors had significant impact.As we 
continue to monitor the situation, we found domains like facebook[.]windows-software-downloads[.]com
and IP addresses such as 77[.]90[.]153[.]225 being used.

During months.Ago analysis, researchers discovered that files.In certain directories were modified.
The campaign appears.To have started earlier than expected.

Legitimate domains like example.com and google.com should be detected.
Repository URLs like github.com/user/repo and bitbucket.org/project should also work.
`;

console.log('=== DEBUGGING IOC EXTRACTION ===\n');

// Test the current domain extraction regex patterns
const domainPatterns = [
  // Standard domains
  /\b[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?))+\b/g,
  // Defanged domains with [.]
  /\b[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\[\.\][a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+\b/g,
];

console.log('Current domain patterns found:');
domainPatterns.forEach((pattern, i) => {
  console.log(`Pattern ${i + 1}:`);
  const matches = testText.match(pattern) || [];
  matches.forEach(match => {
    console.log(`  - "${match}"`);
  });
  console.log('');
});

// Test the sentence fragment filter
const problematicWords = ['payload.In', 'attack.At', 'impact.As', 'months.Ago', 'files.In', 'appears.To'];
console.log('Problematic fragments that should be rejected:');
problematicWords.forEach(word => {
  const isRejected = /\.(in|at|as|or|is|on|to|of|an|it|be|we|he|she|they|the|and|but|for|if|so|no|yes|all|any|can|may|you|me|us|him|her|them|this|that|these|those|when|where|what|who|why|how|ago)\b/i.test(word.toLowerCase());
  console.log(`  - "${word}" -> ${isRejected ? 'REJECTED ✅' : 'ACCEPTED ❌'}`);
});

console.log('\n=== RECOMMENDED FIXES ===');
console.log('1. The sentence fragment filter needs to be more comprehensive');
console.log('2. Need to check word boundaries more carefully'); 
console.log('3. Context analysis should prevent extraction of grammatical constructs');