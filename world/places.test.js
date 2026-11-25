import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  sortExperienceChronologically,
  formatSignYears,
  formatPanelDates,
} from './places.js';

test('sorts jobs oldest to newest and parks TODO start dates at the end', () => {
  const sorted = sortExperienceChronologically([
    { company: 'Now', dates: { start: 'TODO-confirm', end: 'present' } },
    { company: 'Mid', dates: { start: '2016-10', end: '2018-10' } },
    { company: 'Early', dates: { start: '2007-07', end: '2014-05' } },
    { company: 'OverlapShort', dates: { start: '2016-10', end: '2017-11' } },
  ]).map((job) => job.company);
  assert.deepEqual(sorted, ['Early', 'OverlapShort', 'Mid', 'Now']);
});

test('sign years keep the TODO placeholder', () => {
  assert.equal(formatSignYears({ start: '2007-07', end: '2014-05' }), '2007 – 2014');
  assert.equal(formatSignYears({ start: 'TODO-confirm', end: 'present' }), 'TODO-confirm – present');
  assert.equal(formatPanelDates({ start: '2022-12', end: '2024-02' }), '2022-12 – 2024-02');
});

test('resume.json has the Latitude role, fixed titles, and project links', () => {
  const resume = JSON.parse(fs.readFileSync(new URL('../resume.json', import.meta.url), 'utf8'));
  assert.equal(resume.lastUpdated, '2026-11-19');
  assert.equal(resume.experience[0].company, 'Latitude Services');
  assert.equal(resume.experience[0].title, 'IT Security Consultant / Security SME');
  assert.equal(resume.experience[0].employmentType, 'Contract/Consulting');
  assert.equal(resume.experience[0].dates.start, 'TODO-confirm');
  assert.equal(resume.experience[0].dates.end, 'present');
  assert.equal(resume.experience[0].highlights.length, 3);
  const blob = JSON.stringify(resume);
  assert.equal(blob.includes('Inter Internet'), false);
  assert.equal(blob.includes('Internet Security Specialist'), true);
  assert.equal(resume.strengths.some((item) => item.includes('Tanium')), true);
  assert.equal(resume.skills['Endpoint / Tools'].some((item) => item.includes('Tanium')), true);
  const project = resume.projects[0];
  const live = project.links.find((link) => link.label === 'Live');
  const repo = project.links.find((link) => link.label === 'Repo');
  assert.equal(live.url, 'TODO-confirm');
  assert.equal(repo.url, 'https://github.com/ArchieCrawford/Resume2025');
  const companies = sortExperienceChronologically(resume.experience).map((job) => job.company);
  assert.deepEqual(companies, [
    'United States Army',
    'AT&T',
    'Dell SecureWorks',
    'Data Path',
    'American Express',
    'Unisys',
    'Community Loans of America',
    'Ace Group LLC',
    'Moderna',
    'Latitude Services',
  ]);
});
