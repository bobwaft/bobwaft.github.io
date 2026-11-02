import { describe, expect, it } from 'vitest';
import {
  aboutHtml,
  aboutSocials,
  markdownToHtml,
  parseAbout,
  parseFrontMatter,
  titleRuns,
} from '../../src/content/render';
import aboutSource from '../../src/content/about.md?raw';

const about = (front: string, body = 'Hello.') => `---\n${front}\n---\n\n${body}\n`;
const FULL = [
  'name: Ada Lovelace',
  'location: London, UK',
  'email: ada@example.com',
  'linkedin: https://www.linkedin.com/in/ada',
  'github: https://github.com/ada',
].join('\n');

describe('parseFrontMatter', () => {
  it('splits key: value pairs from the body', () => {
    const { data, body } = parseFrontMatter(about('a: 1\nb: two words', 'Body text'));
    expect(data).toEqual({ a: '1', b: 'two words' });
    expect(body.trim()).toBe('Body text');
  });

  it('keeps colons in values, skips comments and blank lines, strips quotes', () => {
    const { data } = parseFrontMatter(about('# note\n\nurl: https://x.io/a:b\nq: "quoted"'));
    expect(data).toEqual({ url: 'https://x.io/a:b', q: 'quoted' });
  });

  it('handles CRLF line endings', () => {
    const { data, body } = parseFrontMatter('---\r\nname: A\r\n---\r\nBody\r\n');
    expect(data).toEqual({ name: 'A' });
    expect(body.trim()).toBe('Body');
  });

  it('returns no data when there is no front matter', () => {
    expect(parseFrontMatter('Just text')).toEqual({ data: {}, body: 'Just text' });
  });
});

describe('markdownToHtml', () => {
  it('renders Markdown', () => {
    expect(markdownToHtml('**bold**')).toContain('<strong>bold</strong>');
  });

  it('opens web links in a new tab without leaking the opener', () => {
    const html = markdownToHtml('[site](https://example.com)');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('leaves mailto links in the same tab', () => {
    expect(markdownToHtml('[mail](mailto:a@b.co)')).not.toContain('target=');
  });
});

describe('parseAbout', () => {
  it('builds the view model', () => {
    const a = parseAbout(about(FULL, 'I build *things*.'));
    expect(a).toMatchObject({
      name: 'Ada Lovelace',
      location: 'London, UK',
      email: 'ada@example.com',
      linkedin: 'https://www.linkedin.com/in/ada',
      github: 'https://github.com/ada',
    });
    expect(a.photo).toBeUndefined();
    expect(a.instagram).toBeUndefined();
    expect(a.tags).toEqual([]);
    expect(a.bodyHtml).toContain('<em>things</em>');
  });

  it('splits comma-separated tags', () => {
    expect(
      parseAbout(
        about(`${FULL}
tags: One, Two ,, Three`),
      ).tags,
    ).toEqual(['One', 'Two', 'Three']);
  });

  it.each(['name', 'location', 'email', 'linkedin', 'github'])('requires %s', (field) => {
    const front = FULL.split('\n')
      .filter((l) => !l.startsWith(`${field}:`))
      .join('\n');
    expect(() => parseAbout(about(front))).toThrow(field);
  });

  it.each(['phone', 'address'])('rejects %s (privacy rule)', (field) => {
    expect(() => parseAbout(about(`${FULL}\n${field}: 123`))).toThrow(field);
  });

  it('rejects non-https profile links', () => {
    const front = FULL.replace('https://github.com/ada', 'javascript:alert(1)');
    expect(() => parseAbout(about(front))).toThrow('github');
    expect(() =>
      parseAbout(
        about(`${FULL}
instagram: http://x.io`),
      ),
    ).toThrow('instagram');
  });
});

describe('titleRuns', () => {
  it('marks *italic* and **accent** words', () => {
    expect(titleRuns('The *more* you **larp**, ok')).toEqual([
      { text: 'The ', style: 'plain' },
      { text: 'more', style: 'em' },
      { text: ' you ', style: 'plain' },
      { text: 'larp', style: 'accent' },
      { text: ', ok', style: 'plain' },
    ]);
  });
});

describe('aboutHtml', () => {
  const a = parseAbout(
    about(`${FULL}
photo: /about/me.webp
tags: Curious, Kind
title: Hi *there* **you**`),
  );

  it('has email, LinkedIn and GitHub links, and Instagram only when set', () => {
    const html = aboutHtml(a);
    expect(html).toContain('href="mailto:ada@example.com"');
    expect(html).toContain('href="https://www.linkedin.com/in/ada"');
    expect(html).toContain('href="https://github.com/ada"');
    expect(html).not.toContain('Instagram');
    const withInsta = parseAbout(
      about(`${FULL}
instagram: https://instagram.com/ada`),
    );
    expect(aboutSocials(withInsta).map((s) => s.label)).toEqual([
      'LinkedIn',
      'GitHub',
      'Instagram',
    ]);
  });

  it('opens profile links in a new tab', () => {
    expect(aboutHtml(a)).toMatch(
      /href="https:\/\/www\.linkedin\.com\/in\/ada"[^>]*target="_blank"/,
    );
  });

  it('includes the photo with alt text, and omits it when absent', () => {
    expect(aboutHtml(a)).toContain('<img src="/about/me.webp" alt="Ada Lovelace"');
    expect(aboutHtml(parseAbout(about(FULL)))).not.toContain('<img');
  });

  it('styles the title runs and starts the tag on the first word', () => {
    const html = aboutHtml(a);
    expect(html).toContain(
      'Hi <span class="about-em">there</span> <span class="about-accent">you</span>',
    );
    expect(html).toContain('<span class="about-tag-word">Curious</span>');
  });

  it('falls back to the name as the title', () => {
    expect(aboutHtml(parseAbout(about(FULL)))).toContain(
      '<h1 class="about-title">Ada Lovelace</h1>',
    );
  });

  it('escapes front-matter values', () => {
    const html = aboutHtml(parseAbout(about(FULL.replace('Ada Lovelace', 'A <b>&</b>'))));
    expect(html).toContain('A &lt;b&gt;&amp;&lt;/b&gt;');
    const titled = aboutHtml(
      parseAbout(
        about(`${FULL}
title: *<i>x</i>*`),
      ),
    );
    expect(titled).toContain('<span class="about-em">&lt;i&gt;x&lt;/i&gt;</span>');
  });
});

describe('about.md', () => {
  it('parses with all required fields', () => {
    expect(() => parseAbout(aboutSource)).not.toThrow();
  });
});
