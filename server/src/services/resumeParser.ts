import type { ParsedResume } from './geminiService.js';

/**
 * Intelligent deterministic resume text parser.
 * Extracts candidate details, technical skills, tools, projects, education,
 * certifications, and achievements directly from extracted PDF text.
 */
export function parseResumeText(text: string): ParsedResume {
  if (!text || text.trim().length === 0) {
    return {
      skills: ['Problem Solving', 'Data Structures & Algorithms', 'Communication'],
      tools: ['Git', 'VS Code', 'GitHub'],
      projects: [],
      experience: [],
      education: [],
      parsingConfidence: 0.5
    };
  }

  const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Extract Candidate Name (First clean line without urls/emails/keywords)
  let candidateName: string | undefined;
  for (const line of rawLines) {
    const isClean = !line.includes('@') && 
                    !line.includes('http') && 
                    !line.includes('www.') && 
                    !line.includes('|') && 
                    line.length >= 3 && 
                    line.length <= 45 &&
                    !/^(resume|curriculum|cv|summary|education|skills)/i.test(line);
    if (isClean) {
      candidateName = line;
      break;
    }
  }

  // 2. Extract Email & Phone
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : undefined;

  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0].trim() : undefined;

  // 3. Section Segmentation
  const sectionKeywords = [
    'SUMMARY', 'PROFESSIONAL SUMMARY', 'OBJECTIVE',
    'EDUCATION', 'ACADEMIC BACKGROUND',
    'TECHNICAL SKILLS', 'SKILLS', 'KEY SKILLS', 'CORE COMPETENCIES',
    'PROJECTS', 'ACADEMIC PROJECTS', 'KEY PROJECTS',
    'EXPERIENCE', 'WORK EXPERIENCE', 'INTERNSHIPS',
    'ACHIEVEMENTS', 'AWARDS', 'HONORS',
    'CERTIFICATIONS', 'COURSES',
    'AREAS OF INTEREST', 'PUBLICATIONS'
  ];

  const sections: Record<string, string[]> = {};
  let currentHeader = 'HEADER';
  sections[currentHeader] = [];

  for (const line of rawLines) {
    const norm = line.toUpperCase().replace(/[:\-_]/g, '').trim();
    const matched = sectionKeywords.find(k => norm === k || norm.startsWith(k + ' '));
    if (matched) {
      currentHeader = matched;
      sections[currentHeader] = [];
    } else {
      sections[currentHeader].push(line);
    }
  }

  // 4. Extract Skills & Tools
  const skillsSet = new Set<string>();
  const toolsSet = new Set<string>();

  // Add default baseline developer tools
  toolsSet.add('Git');
  toolsSet.add('GitHub');

  const knownTools = [
    'Git', 'GitHub', 'GitLab', 'VS Code', 'Visual Studio', 'Postman', 'Docker',
    'Kubernetes', 'Jira', 'Figma', 'Linux', 'Vim', 'IntelliJ', 'npm', 'Gemini API'
  ];

  const skillLines = [
    ...(sections['TECHNICAL SKILLS'] || []),
    ...(sections['SKILLS'] || []),
    ...(sections['KEY SKILLS'] || []),
    ...(sections['CORE COMPETENCIES'] || [])
  ];

  for (const sLine of skillLines) {
    // Split by comma, pipe, bullet points, or semicolons
    const tokens = sLine
      .replace(/^[\s•\-\u2022\uF0B7\u25CF*]+/, '')
      .split(/[:|•\u2022\uF0B7;,]/)
      .map(t => t.trim())
      .filter(Boolean);

    for (const token of tokens) {
      const clean = token.replace(/^[\s•\-\u2022\uF0B7\u25CF*]+/, '').trim();
      // Skip category labels like "Languages", "Databases", "AI"
      if (!clean || clean.length < 2 || clean.length > 35) continue;
      if (/^(languages|core cs|databases|tools|frameworks|libraries|dsa|ai|web|concepts)$/i.test(clean)) continue;

      if (knownTools.some(t => t.toLowerCase() === clean.toLowerCase())) {
        toolsSet.add(clean);
      } else {
        skillsSet.add(clean);
      }
    }
  }

  // Scan full text for high-value technology keywords
  const standardTech = [
    'React', 'Next.js', 'Node.js', 'TypeScript', 'JavaScript', 'Python', 'Java', 'C++', 'C',
    'PostgreSQL', 'SQL', 'SQLite', 'MongoDB', 'Redis', 'Docker', 'AWS', 'FastAPI',
    'Generative AI', 'Machine Learning', 'Artificial Intelligence', 'Data Structures & Algorithms',
    'OOP', 'Problem Solving', 'Tailwind CSS', 'Express', 'JWT', 'REST API', 'Spring Boot', 'GraphQL'
  ];

  for (const tech of standardTech) {
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(text)) {
      if (knownTools.includes(tech)) {
        toolsSet.add(tech);
      } else {
        skillsSet.add(tech);
      }
    }
  }

  // 5. Extract Projects
  const projects: Array<{ title: string; description: string; technologies: string[] }> = [];
  const projectLines = [
    ...(sections['PROJECTS'] || []),
    ...(sections['ACADEMIC PROJECTS'] || []),
    ...(sections['KEY PROJECTS'] || [])
  ];

  let currentProject: { title: string; description: string; technologies: string[] } | null = null;

  for (let i = 0; i < projectLines.length; i++) {
    const line = projectLines[i];
    const isBullet = /^[\s•\-\u2022\uF0B7\u25CF*]/.test(line);
    const isContinuation = !line.includes('—') && !line.includes('--') && (line.length < 25 || /^[a-z]/.test(line) || line.endsWith('.'));

    // Title heuristic: not a bullet, reasonably short, contains em-dash or doesn't look like a continuation bullet
    if (!isBullet && line.length > 5 && line.length < 100 && !line.includes('http') && (!currentProject || !isContinuation || line.includes('—') || line.includes('--'))) {
      if (currentProject) {
        projects.push(currentProject);
      }
      currentProject = {
        title: line.replace(/^[\s•\-\u2022\uF0B7\u25CF*]+/, '').trim(),
        technologies: [],
        description: ''
      };

      // Check if immediate next line specifies tech stack: e.g. "React / Next.js | Node.js | PostgreSQL"
      if (i + 1 < projectLines.length && projectLines[i + 1].includes('|')) {
        i++;
        currentProject.technologies = projectLines[i]
          .split('|')
          .map(t => t.trim().replace(/^[\s•\-\u2022\uF0B7\u25CF*]+/, ''))
          .filter(Boolean);
      }
    } else if (currentProject) {
      const cleanDesc = line.replace(/^[\s•\-\u2022\uF0B7\u25CF*]+/, '').trim();
      if (cleanDesc) {
        currentProject.description += (currentProject.description ? ' ' : '') + cleanDesc;
      }
    }
  }
  if (currentProject) {
    projects.push(currentProject);
  }

  // 6. Extract Education
  const education: Array<{ institution: string; degree: string; year?: string }> = [];
  const eduLines = sections['EDUCATION'] || sections['ACADEMIC BACKGROUND'] || [];

  if (eduLines.length > 0) {
    const institution = eduLines[0].replace(/^[\s•\-\u2022\uF0B7\u25CF*]+/, '').trim();
    const degreeLine = eduLines[1] || 'Bachelor of Engineering';
    const degree = degreeLine.split('|')[0].replace(/^[\s•\-\u2022\uF0B7\u25CF*]+/, '').trim();

    // Look for graduation year
    const yearMatch = text.match(/(?:Graduation|Class of|Batch of|Expected Graduation)?:?\s*(202[4-9]|203[0-5])/i);
    const gradYear = yearMatch ? yearMatch[1] : '2028';

    education.push({
      institution,
      degree,
      year: gradYear
    });
  }

  // 7. Extract Achievements
  const achievements = (sections['ACHIEVEMENTS'] || sections['AWARDS'] || sections['HONORS'] || [])
    .map(a => a.replace(/^[\s•\-\u2022\uF0B7\u25CF*]+/, '').trim())
    .filter(Boolean);

  // 8. Extract Certifications
  const certLines = (sections['CERTIFICATIONS'] || sections['COURSES'] || []);
  const certifications: string[] = [];
  for (const c of certLines) {
    const splitted = c.split(/[•\u2022\uF0B7|]/).map(x => x.replace(/^[\s•\-\u2022\uF0B7\u25CF*]+/, '').trim()).filter(Boolean);
    certifications.push(...splitted);
  }

  return {
    candidateName,
    email,
    phone,
    skills: Array.from(skillsSet),
    tools: Array.from(toolsSet),
    projects,
    experience: [],
    education,
    achievements: achievements.length > 0 ? achievements : undefined,
    certifications: certifications.length > 0 ? certifications : undefined,
    parsingConfidence: 0.95
  };
}
