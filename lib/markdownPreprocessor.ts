/**
 * Intelligent converter that takes ANY AI response format and converts it to proper markdown
 * Handles: plain text, partial markdown, malformed markdown, mixed formats
 * Pattern-based detection - no predefined words
 * 
 * @param content - The content to preprocess
 * @param isStreaming - If true, be more lenient with partial markdown (for streaming)
 */
export function preprocessMarkdown(content: string, isStreaming: boolean = false): string {
  if (!content || typeof content !== 'string') return '';
  
  // For streaming, don't trim trailing whitespace (might be incomplete)
  let processed = isStreaming ? content : content.trim();
  
  // Step 1: Normalize line endings
  processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Step 2: Fix excessive blank lines
  processed = processed.replace(/\n{3,}/g, '\n\n');
  
  // Step 3: Convert plain text headers to markdown headers
  // Pattern: Lines that start with capitalized words (2-4 words, <50 chars) followed by content
  // This catches headers like "Quick Answer", "Detailed Explanation", etc.
  // Skip this step if streaming and content is very short (likely incomplete)
  if (!isStreaming || processed.length > 50) {
    const lines = processed.split('\n');
    const processedLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Check if this line looks like a header (capitalized, 2-4 words, short)
      const words = trimmed.split(/\s+/);
      const isPotentialHeader = 
        words.length >= 2 && 
        words.length <= 4 && 
        trimmed.length < 50 &&
        /^[A-Z]/.test(trimmed) &&
        !trimmed.includes('**') && // Not already markdown
        !trimmed.match(/^[-•*]\s/) && // Not a list item
        !trimmed.match(/^\d+\./); // Not a numbered list
      
      if (isPotentialHeader) {
        // Check if next line has content (not empty, not another header)
        const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
        const isFollowedByContent = nextLine && 
          nextLine.length > 10 && 
          !nextLine.match(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}$/); // Not another header
        
        if (isFollowedByContent || i === 0) {
          // Convert to bold header with colon
          processedLines.push(`**${trimmed}:**`);
          continue;
        }
      }
      
      processedLines.push(line);
    }
    
    processed = processedLines.join('\n');
  }
  
  // Step 4: Fix malformed bold markers
  // Pattern: "**Text\n" -> "**Text:**\n\n"
  processed = processed.replace(/\*\*([^*\n]+?)(\s*\n|\s*$)/g, (match, text) => {
    const trimmed = text.trim();
    if (trimmed.length < 50 && /^[A-Z]/.test(trimmed)) {
      const words = trimmed.split(' ');
      if (words.length >= 1 && words.length <= 4) {
        return `**${trimmed}:**\n\n`;
      }
    }
    return `**${trimmed}**\n`;
  });
  
  // Step 5: Fix double bold issues - "**Text1**Text2**"
  processed = processed.replace(/\*\*([^*]+)\*\*([A-Z][a-z]+)\*\*/g, (match, text1, text2) => {
    const text1Words = text1.split(' ');
    if (text1Words.length >= 2 && text2.length < 30) {
      return `**${text1} a ${text2}:**\n\n`;
    }
    return `**${text1}:**\n\n**${text2}:**\n\n`;
  });
  
  // Step 6: Fix headers immediately followed by text (no separator)
  // Pattern: "HeaderText" -> "**Header:**\n\nText"
  processed = processed.replace(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)([A-Z][a-z]+)/g, (match, header, text) => {
    const headerWords = header.split(' ');
    if (headerWords.length >= 2 && headerWords.length <= 4 && header.length < 50 && text.length > 3) {
      const lastWord = headerWords[headerWords.length - 1];
      if (lastWord.length >= 4) {
        return `**${header}:**\n\n${text}`;
      }
    }
    return match;
  });
  
  // Step 7: Fix headers followed by lists
  // Pattern: "**Header- item" -> "**Header:**\n\n- item"
  processed = processed.replace(/\*\*([^*\n:]+?)([-•])\s+/g, (match, header, bullet) => {
    const cleanHeader = header.trim();
    if (cleanHeader.length < 50 && /^[A-Z]/.test(cleanHeader)) {
      return `**${cleanHeader}:**\n\n${bullet} `;
    }
    return match;
  });
  
  // Pattern: "**Header\n" followed by list
  processed = processed.replace(/\*\*([^*\n:]+?)\s*\n\s*([-•])\s+/g, (match, header, bullet) => {
    const cleanHeader = header.trim();
    if (cleanHeader.length < 50 && /^[A-Z]/.test(cleanHeader)) {
      return `**${cleanHeader}:**\n\n${bullet} `;
    }
    return match;
  });
  
  // Step 8: Convert plain text lists to markdown lists
  // Pattern: Lines starting with "- " or "• " or numbers
  processed = processed.replace(/^([-•])\s+(.+)$/gm, (match, bullet, text) => {
    if (!text.includes('**') && !text.includes('*')) {
      return `- ${text}`;
    }
    return match;
  });
  
  // Step 9: Ensure proper spacing around headers
  processed = processed.replace(/(\*\*[^*]+:\*\*)\s*([^\n])/g, '$1\n\n$2');
  processed = processed.replace(/([^\n])\s*(\*\*[^*]+:\*\*)/g, '$1\n\n$2');
  
  // Step 10: Fix text running into headers
  // Pattern: "sentence.\nHeaderText" -> "sentence.\n\n**HeaderText:**"
  processed = processed.replace(/([.!?]\s+)\n([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})(\s|$)/g, (match, punct, header) => {
    if (header.length < 50 && header.split(' ').length <= 4) {
      return `${punct}\n\n**${header}:**\n\n`;
    }
    return match;
  });
  
  // Step 11: Clean up excessive blank lines
  processed = processed.replace(/\n{3,}/g, '\n\n');
  
  // Step 12: Final cleanup (skip trimming for streaming)
  if (!isStreaming) {
    processed = processed.split('\n').map(line => line.trimEnd()).join('\n');
    processed = processed.trim();
  }
  
  return processed;
}

/**
 * Detects if content is likely plain text that needs formatting
 */
export function isPlainText(content: string): boolean {
  if (!content) return false;
  
  // Check for markdown indicators
  const hasMarkdown = /(\*\*|__|#|\[.*\]\(|```|`|>|\|)/.test(content);
  
  // Check for structured content (lists, headers)
  const hasStructure = /(^\d+\.|^[-•*]|^#{1,6}\s)/m.test(content);
  
  return !hasMarkdown && !hasStructure;
}

/**
 * Intelligently formats plain text into readable structure
 */
export function formatPlainText(content: string): string {
  if (!content) return '';
  
  let formatted = content.trim();
  
  // Split into sentences
  const sentences = formatted.split(/([.!?]\s+)/);
  
  // If it's a long paragraph, try to break it into logical sections
  if (sentences.length > 6) {
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i] + (sentences[i + 1] || '');
      currentChunk += sentence;
      
      // Break at natural points
      if (currentChunk.length > 200 || 
          /(however|moreover|additionally|also|furthermore|in addition|meanwhile|therefore|thus|hence|consequently|for example|for instance|specifically|in particular|in summary|to summarize|in conclusion|finally|lastly|first|second|third|next|then|after that|on the other hand|in contrast|similarly|likewise|as a result|as a consequence|in other words|that is)/i.test(sentence)) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
    }
    
    if (currentChunk) chunks.push(currentChunk.trim());
    
    if (chunks.length > 1) {
      formatted = chunks.join('\n\n');
    }
  }
  
  return formatted;
}
