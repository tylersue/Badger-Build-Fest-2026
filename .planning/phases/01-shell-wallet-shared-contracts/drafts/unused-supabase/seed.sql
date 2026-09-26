-- Phase 1 seed: placeholder content, real mechanics (D-03).
-- Inserts only, every statement idempotent (on conflict do nothing).
-- Fixed ids: 00000000-0000-4000-80TT-0000000000NN
--   TT 01 identities, 02 agents, 03 sources, 04 chunks, 05 conversations,
--      06 messages, 07 interview_sessions, 08 interview_turns, 09 ledger,
--      10 llm_usage, 11 ratings
-- demo_reset() keeps rows with this prefix and drops runtime activity.
-- Timestamps are relative to seeding time so the history always looks recent.
-- Invariant: every wallet balance equals the sum of that identity's ledger rows.

-- identities --------------------------------------------------------------
insert into public.identities (id, kind, display_name, avatar_initial, avatar_color, is_switchable) values
  ('00000000-0000-4000-8001-000000000001', 'expert', 'Maria Chen',  'M', '#5a4636', true),
  ('00000000-0000-4000-8001-000000000002', 'hirer',  'Sam Okafor',  'S', '#2f5a4b', true),
  ('00000000-0000-4000-8001-000000000003', 'expert', 'Dev Patel',   'D', '#3b2560', false),
  ('00000000-0000-4000-8001-000000000004', 'expert', 'Priya Nair',  'P', '#084d31', false),
  ('00000000-0000-4000-8001-000000000005', 'expert', 'Luis Ortega', 'L', '#1566b8', false),
  ('00000000-0000-4000-8001-000000000006', 'expert', 'Hannah Kim',  'H', '#6244a0', false),
  ('00000000-0000-4000-8001-000000000007', 'expert', 'Tom Reyes',   'T', '#079455', false),
  ('00000000-0000-4000-8001-000000000008', 'hirer',  'Jordan Lee',  'J', '#5a3a36', false),
  ('00000000-0000-4000-8001-000000000009', 'hirer',  'Alex Rivera', 'A', '#36475a', false)
on conflict (id) do nothing;

-- profiles ----------------------------------------------------------------
insert into public.profiles (identity_id, field, credentials, years_experience, contact_url, bio, location) values
  ('00000000-0000-4000-8001-000000000001', 'Physical therapy', 'DPT, OCS', 15, 'https://cal.com/maria-chen',
   'Fifteen years in outpatient ortho. I run a small practice in Madison and teach a rehab elective.', 'Madison, WI'),
  ('00000000-0000-4000-8001-000000000002', null, null, null, null,
   'Freelance designer. Hires experts when a search engine is not enough.', 'Milwaukee, WI'),
  ('00000000-0000-4000-8001-000000000003', 'Tax preparation', 'Enrolled Agent (IRS)', 11, 'https://cal.com/dev-patel',
   'Prepares returns for 300+ freelancers a year, mostly designers, writers and developers.', 'Chicago, IL'),
  ('00000000-0000-4000-8001-000000000004', 'College admissions', 'Former admissions reader, M.Ed.', 9, 'https://cal.com/priya-nair',
   'Read applications for a Big Ten admissions office for five years before going independent.', 'Ann Arbor, MI'),
  ('00000000-0000-4000-8001-000000000005', 'Strength coaching', 'CSCS', 12, 'https://cal.com/luis-ortega',
   'Coaches busy adults with old injuries. Believes the best program is the one you finish.', 'Minneapolis, MN'),
  ('00000000-0000-4000-8001-000000000006', 'Personal finance', 'CFP', 7, 'https://cal.com/hannah-kim',
   'Works with people in their first five years of full-time work.', 'Madison, WI'),
  ('00000000-0000-4000-8001-000000000007', 'Career coaching', 'Former technical recruiter', 14, 'https://cal.com/tom-reyes',
   'Screened thousands of resumes as a recruiter; now helps candidates get past that screen.', 'Denver, CO')
on conflict (identity_id) do nothing;

-- agents ------------------------------------------------------------------
insert into public.agents (id, owner_id, slug, name, category, icon, headline, description, persona, system_prompt, greeting, example_questions,
                           status, rate_multiplier, consent_accepted_at, rating_avg, rating_count, usage_count, published_at, created_at) values
  ('00000000-0000-4000-8002-000000000001', '00000000-0000-4000-8001-000000000001', 'maria-chen-physical-therapy',
   'Maria Chen · Physical therapy', 'health_pt', 'activity',
   'Post-op rehab and return-to-running plans',
   'Fifteen years in outpatient ortho. Ask about post-op knee and shoulder rehab, return-to-running plans, and what to do when a flare-up hits. Answers come from Maria''s own interview and clinic notes.',
   '{"name":"Maria Chen · Physical therapy","category":"health_pt","headline":"Post-op rehab and return-to-running plans","description":"Post-op knee and shoulder rehab, return-to-running plans, what to do when a flare-up hits.","howIWork":"Pattern first, then the test, then the plan.","always":["Cite the answer or page it came from","Say when something needs an in-person visit"],"never":["Diagnose","Recommend medication doses"],"exampleQuestions":["My knee is swollen three weeks after an ACL repair. Normal?","How do I get back to running without wrecking my shins again?","What does a good week of shoulder rehab look like?"],"greeting":"Hi, I''m Maria''s agent. Ask me about rehab after surgery or getting back to running."}'::jsonb,
   'You are the agent of Maria Chen, a physical therapist. Answer only from Maria''s interview answers and documents, cite them as [n], and say when you do not know.',
   'Hi, I''m Maria''s agent. Ask me about rehab after surgery or getting back to running.',
   array['My knee is swollen three weeks after an ACL repair. Normal?', 'How do I get back to running without wrecking my shins again?', 'What does a good week of shoulder rehab look like?'],
   'published', 2, now() - interval '20 days', 4.8, 23, 41, now() - interval '20 days', now() - interval '22 days'),

  ('00000000-0000-4000-8002-000000000002', '00000000-0000-4000-8001-000000000003', 'dev-patel-tax-for-freelancers',
   'Dev Patel · Tax for freelancers', 'tax_finance', 'calculator',
   'Quarterly estimates and 1099 questions, answered plainly',
   'Quarterly estimates, home-office deductions, and the 1099 questions nobody answers plainly.',
   '{"name":"Dev Patel · Tax for freelancers","category":"tax_finance","headline":"Quarterly estimates and 1099 questions, answered plainly","description":"Quarterly estimates, home-office deductions, and the 1099 questions nobody answers plainly.","howIWork":"Start from last year''s return, then the safe-harbor rule, then this year''s numbers.","always":["Name the form or rule the answer rests on"],"never":["File or sign anything for you","Guess at state-specific rules"],"exampleQuestions":["How much should I pay for my Q3 estimate?","Can I deduct my home office if I also work at a café?","Do I need to send 1099s to my subcontractors?"],"greeting":"Hi, I''m Dev''s agent. Ask me about freelancer taxes."}'::jsonb,
   'You are the agent of Dev Patel, an enrolled agent. Answer only from Dev''s knowledge, cite it as [n], and say when you do not know.',
   'Hi, I''m Dev''s agent. Ask me about freelancer taxes.',
   array['How much should I pay for my Q3 estimate?', 'Can I deduct my home office if I also work at a café?', 'Do I need to send 1099s to my subcontractors?'],
   'published', 1.5, now() - interval '18 days', 4.6, 41, 88, now() - interval '18 days', now() - interval '19 days'),

  ('00000000-0000-4000-8002-000000000003', '00000000-0000-4000-8001-000000000004', 'priya-nair-college-admissions',
   'Priya Nair · College admissions', 'career_admissions', 'graduation-cap',
   'Essays and school lists from a former admissions reader',
   'Essay strategy, school lists that make sense, and how to talk about a bad semester.',
   '{"name":"Priya Nair · College admissions","category":"career_admissions","headline":"Essays and school lists from a former admissions reader","description":"Essay strategy, school lists that make sense, and how to talk about a bad semester.","howIWork":"Read it the way a tired reader at 11pm would, then fix the first paragraph.","always":["Point to the sentence that needs work"],"never":["Write the essay for you"],"exampleQuestions":["Is my college essay opening too slow?","How many reach schools should be on my list?","How do I explain a bad semester?"],"greeting":"Hi, I''m Priya''s agent. Paste an essay or ask about your list."}'::jsonb,
   'You are the agent of Priya Nair, a former admissions reader. Answer only from Priya''s knowledge, cite it as [n], and say when you do not know.',
   'Hi, I''m Priya''s agent. Paste an essay or ask about your list.',
   array['Is my college essay opening too slow?', 'How many reach schools should be on my list?', 'How do I explain a bad semester?'],
   'published', 1.5, now() - interval '15 days', 4.9, 12, 27, now() - interval '15 days', now() - interval '16 days'),

  ('00000000-0000-4000-8002-000000000004', '00000000-0000-4000-8001-000000000005', 'luis-ortega-strength-coaching',
   'Luis Ortega · Strength coaching', 'health_pt', 'heart-pulse',
   'Strength programs for busy adults with old injuries',
   'Programming for busy adults, deload weeks, and training around old injuries.',
   '{"name":"Luis Ortega · Strength coaching","category":"health_pt","headline":"Strength programs for busy adults with old injuries","description":"Programming for busy adults, deload weeks, and training around old injuries.","howIWork":"Three sessions a week, one main lift each, and a plan for the bad weeks.","always":["Give a regression for every exercise"],"never":["Program through sharp pain"],"exampleQuestions":["What does a three-day beginner program look like?","When should I take a deload week?","Can I squat with an old meniscus tear?"],"greeting":"Hi, I''m Luis''s agent. Ask me about training around a busy week."}'::jsonb,
   'You are the agent of Luis Ortega, a strength coach. Answer only from Luis''s knowledge, cite it as [n], and say when you do not know.',
   'Hi, I''m Luis''s agent. Ask me about training around a busy week.',
   array['What does a three-day beginner program look like?', 'When should I take a deload week?', 'Can I squat with an old meniscus tear?'],
   'published', 1, now() - interval '12 days', 4.7, 18, 33, now() - interval '12 days', now() - interval '13 days'),

  ('00000000-0000-4000-8002-000000000005', '00000000-0000-4000-8001-000000000006', 'hannah-kim-first-job-finances',
   'Hannah Kim · First-job finances', 'tax_finance', 'piggy-bank',
   'Money basics for your first five years of work',
   '401(k) match math, emergency funds, and which credit card questions actually matter at 23.',
   '{"name":"Hannah Kim · First-job finances","category":"tax_finance","headline":"Money basics for your first five years of work","description":"401(k) match math, emergency funds, and which credit card questions actually matter at 23.","howIWork":"Match first, emergency fund second, everything else third.","always":["Show the math"],"never":["Recommend individual stocks"],"exampleQuestions":["How much should I put in my 401(k)?","How big should my emergency fund be?","Should I pay off my card or save first?"],"greeting":"Hi, I''m Hannah''s agent. Ask me about your first paychecks."}'::jsonb,
   'You are the agent of Hannah Kim, a financial planner. Answer only from Hannah''s knowledge, cite it as [n], and say when you do not know.',
   'Hi, I''m Hannah''s agent. Ask me about your first paychecks.',
   array['How much should I put in my 401(k)?', 'How big should my emergency fund be?', 'Should I pay off my card or save first?'],
   'published', 1, now() - interval '9 days', 4.5, 9, 14, now() - interval '9 days', now() - interval '10 days'),

  ('00000000-0000-4000-8002-000000000006', '00000000-0000-4000-8001-000000000007', 'tom-reyes-resume-interviews',
   'Tom Reyes · Resume & interviews', 'career_admissions', 'briefcase',
   'Resumes that survive the screen, interviews that don''t sound rehearsed',
   'Resumes that survive the screen, STAR answers that don''t sound rehearsed, offer negotiation.',
   '{"name":"Tom Reyes · Resume & interviews","category":"career_admissions","headline":"Resumes that survive the screen, interviews that don''t sound rehearsed","description":"Resumes that survive the screen, STAR answers that don''t sound rehearsed, offer negotiation.","howIWork":"Six seconds on the resume, then the story behind each bullet.","always":["Rewrite one bullet as an example"],"never":["Invent experience"],"exampleQuestions":["Why is my resume not getting callbacks?","How do I answer ''tell me about a conflict''?","Should I negotiate my first offer?"],"greeting":"Hi, I''m Tom''s agent. Paste a resume bullet or ask about an interview."}'::jsonb,
   'You are the agent of Tom Reyes, a former recruiter. Answer only from Tom''s knowledge, cite it as [n], and say when you do not know.',
   'Hi, I''m Tom''s agent. Paste a resume bullet or ask about an interview.',
   array['Why is my resume not getting callbacks?', 'How do I answer ''tell me about a conflict''?', 'Should I negotiate my first offer?'],
   'published', 1, now() - interval '7 days', 4.8, 33, 61, now() - interval '7 days', now() - interval '8 days'),

  ('00000000-0000-4000-8002-000000000007', '00000000-0000-4000-8001-000000000001', 'maria-chen-running-form-clinic',
   'Maria Chen · Running form clinic', 'health_pt', 'footprints',
   'Cadence, shin splints and easy fixes for runners',
   'Running form, cadence, and what to change first when your shins hurt.',
   '{"name":"Maria Chen · Running form clinic","category":"health_pt","headline":"Cadence, shin splints and easy fixes for runners","description":"Running form, cadence, and what to change first when your shins hurt.","howIWork":"Film it, count it, change one thing.","always":["Change one variable at a time"],"never":["Diagnose"],"exampleQuestions":["Should I raise my cadence?","Why do my shins hurt after long runs?"],"greeting":"Hi, I''m Maria''s running clinic agent."}'::jsonb,
   null,
   'Hi, I''m Maria''s running clinic agent.',
   array['Should I raise my cadence?', 'Why do my shins hurt after long runs?'],
   'draft', 1, null, 0, 0, 0, null, now() - interval '1 day')
on conflict (id) do nothing;

-- sources -----------------------------------------------------------------
insert into public.sources (id, agent_id, kind, name, status, chunk_count, page_count, bytes, created_at) values
  ('00000000-0000-4000-8003-000000000001', '00000000-0000-4000-8002-000000000001', 'interview', 'Interview answers',          'ready',      38, null, 0,      now() - interval '21 days'),
  ('00000000-0000-4000-8003-000000000002', '00000000-0000-4000-8002-000000000001', 'pdf',       'ACL-rehab-protocol.pdf',     'ready',      42, 14,   812000, now() - interval '5 days'),
  ('00000000-0000-4000-8003-000000000003', '00000000-0000-4000-8002-000000000001', 'md',        'Return-to-run checklist.md', 'processing', 0,  null, 6400,   now() - interval '2 hours'),
  ('00000000-0000-4000-8003-000000000004', '00000000-0000-4000-8002-000000000002', 'interview', 'Interview answers',          'ready',      24, null, 0,      now() - interval '19 days'),
  ('00000000-0000-4000-8003-000000000005', '00000000-0000-4000-8002-000000000003', 'interview', 'Interview answers',          'ready',      12, null, 0,      now() - interval '16 days'),
  ('00000000-0000-4000-8003-000000000006', '00000000-0000-4000-8002-000000000004', 'interview', 'Interview answers',          'ready',      18, null, 0,      now() - interval '13 days'),
  ('00000000-0000-4000-8003-000000000007', '00000000-0000-4000-8002-000000000005', 'interview', 'Interview answers',          'ready',      10, null, 0,      now() - interval '10 days'),
  ('00000000-0000-4000-8003-000000000008', '00000000-0000-4000-8002-000000000006', 'interview', 'Interview answers',          'ready',      30, null, 0,      now() - interval '8 days'),
  ('00000000-0000-4000-8003-000000000009', '00000000-0000-4000-8002-000000000007', 'interview', 'Interview answers',          'ready',      6,  null, 0,      now() - interval '1 day')
on conflict (id) do nothing;

-- chunks (embeddings stay null until Phase 2) -----------------------------
insert into public.chunks (id, agent_id, source_id, position, page, heading_path, question, content, created_at) values
  ('00000000-0000-4000-8004-000000000001', '00000000-0000-4000-8002-000000000001', '00000000-0000-4000-8003-000000000001', 1, null, null,
   'When someone comes in three weeks after an ACL repair worried about swelling, what do you look at first?',
   'First thing is the pattern. Swelling that''s worse at night after a busy day and better in the morning is the knee doing its job. What worries me is swelling that''s warm, that came on fast, or that comes with calf pain, because then I''m thinking infection or clot and that''s a phone call, not a home exercise.',
   now() - interval '21 days'),
  ('00000000-0000-4000-8004-000000000002', '00000000-0000-4000-8002-000000000001', '00000000-0000-4000-8003-000000000001', 2, null, null,
   'How do you tell a patient what counts as warm?',
   'Compare it with the other knee using the back of your hand. Noticeably warmer than the other side, plus redness, is the combination I care about. Warm alone right after exercise is expected.',
   now() - interval '21 days'),
  ('00000000-0000-4000-8004-000000000003', '00000000-0000-4000-8002-000000000001', '00000000-0000-4000-8003-000000000002', 3, 3, 'Weeks 2-6 › Swelling',
   null,
   'Weeks 2-6: ice for 15 minutes after activity, keep quad sets at 3 x 15 daily, and do not reduce walking to manage swelling unless it is warm or painful at rest.',
   now() - interval '5 days'),
  ('00000000-0000-4000-8004-000000000004', '00000000-0000-4000-8002-000000000001', '00000000-0000-4000-8003-000000000002', 4, 7, 'Return to running › Criteria',
   null,
   'Return to running criteria: full knee extension, no effusion after a 30-minute walk, and single-leg squat to 60 degrees without the knee drifting inward.',
   now() - interval '5 days'),
  ('00000000-0000-4000-8004-000000000005', '00000000-0000-4000-8002-000000000007', '00000000-0000-4000-8003-000000000009', 1, null, null,
   'What is the first thing you change when a runner''s shins hurt?',
   'Volume before form. Most shin pain I see is a runner who added mileage too fast. Cut the long run by a third for two weeks, then look at cadence.',
   now() - interval '1 day')
on conflict (id) do nothing;

-- interview ---------------------------------------------------------------
insert into public.interview_sessions (id, agent_id, status, turn_count, created_at) values
  ('00000000-0000-4000-8007-000000000001', '00000000-0000-4000-8002-000000000001', 'completed', 38, now() - interval '21 days'),
  ('00000000-0000-4000-8007-000000000002', '00000000-0000-4000-8002-000000000007', 'paused',    6,  now() - interval '1 day')
on conflict (id) do nothing;

insert into public.interview_turns (id, session_id, agent_id, position, question, answer, chunk_id, created_at) values
  ('00000000-0000-4000-8008-000000000001', '00000000-0000-4000-8007-000000000001', '00000000-0000-4000-8002-000000000001', 1,
   'Let''s start with the thing you get asked most. When someone comes in three weeks after an ACL repair worried about swelling, what do you actually look at first, and what tells you it''s normal versus a problem?',
   'First thing is the pattern. Swelling that''s worse at night after a busy day and better in the morning is the knee doing its job. What worries me is swelling that''s warm, that came on fast, or that comes with calf pain, because then I''m thinking infection or clot and that''s a phone call, not a home exercise.',
   '00000000-0000-4000-8004-000000000001', now() - interval '21 days'),
  ('00000000-0000-4000-8008-000000000002', '00000000-0000-4000-8007-000000000001', '00000000-0000-4000-8002-000000000001', 2,
   'That "night vs morning" pattern is exactly the kind of thing a textbook won''t say. How do you explain to a patient what counts as warm?',
   'Compare it with the other knee using the back of your hand. Noticeably warmer than the other side, plus redness, is the combination I care about. Warm alone right after exercise is expected.',
   '00000000-0000-4000-8004-000000000002', now() - interval '21 days' + interval '3 minutes'),
  ('00000000-0000-4000-8008-000000000003', '00000000-0000-4000-8007-000000000001', '00000000-0000-4000-8002-000000000001', 3,
   'Give me a concrete example: a patient who thought they had a problem and didn''t, and what you told them.',
   'A marathoner, week four after surgery, swollen every evening. She thought the graft had failed. It was the pattern, and she was icing before activity instead of after. We swapped the order and it settled in a week.',
   null, now() - interval '21 days' + interval '6 minutes'),
  ('00000000-0000-4000-8008-000000000004', '00000000-0000-4000-8007-000000000002', '00000000-0000-4000-8002-000000000007', 1,
   'What is the first thing you change when a runner''s shins hurt?',
   'Volume before form. Most shin pain I see is a runner who added mileage too fast. Cut the long run by a third for two weeks, then look at cadence.',
   '00000000-0000-4000-8004-000000000005', now() - interval '1 day'),
  ('00000000-0000-4000-8008-000000000005', '00000000-0000-4000-8007-000000000002', '00000000-0000-4000-8002-000000000007', 2,
   'When you do look at cadence, what number are you hoping to see, and how fast do you ask someone to change it?',
   null, null, now() - interval '1 day' + interval '4 minutes')
on conflict (id) do nothing;

-- conversations -----------------------------------------------------------
insert into public.conversations (id, agent_id, hirer_id, title, share_transcript, message_count, spent_cents, last_message_at, created_at) values
  ('00000000-0000-4000-8005-000000000001', '00000000-0000-4000-8002-000000000001', '00000000-0000-4000-8001-000000000002', 'Knee swelling after ACL repair',       false, 6, 12, now() - interval '10 minutes',        now() - interval '30 minutes'),
  ('00000000-0000-4000-8005-000000000002', '00000000-0000-4000-8002-000000000002', '00000000-0000-4000-8001-000000000002', 'Quarterly estimate for Q3',            true,  4, 6,  now() - interval '1 day',             now() - interval '1 day 20 minutes'),
  ('00000000-0000-4000-8005-000000000003', '00000000-0000-4000-8002-000000000003', '00000000-0000-4000-8001-000000000002', 'Essay draft feedback',                 false, 4, 6,  now() - interval '3 days',            now() - interval '3 days 25 minutes'),
  ('00000000-0000-4000-8005-000000000004', '00000000-0000-4000-8002-000000000001', '00000000-0000-4000-8001-000000000008', 'Shoulder rehab week plan',             true,  4, 8,  now() - interval '4 days',            now() - interval '4 days 30 minutes'),
  ('00000000-0000-4000-8005-000000000005', '00000000-0000-4000-8002-000000000001', '00000000-0000-4000-8001-000000000009', 'Return to running after shin splints', false, 2, 4,  now() - interval '2 days',            now() - interval '2 days 15 minutes')
on conflict (id) do nothing;

-- messages ----------------------------------------------------------------
insert into public.messages (id, conversation_id, role, content, citations, feedback, cost_cents, tokens_in, tokens_out, model, latency_ms, created_at) values
  -- Sam x Maria: knee swelling (3 replies x 4 credits)
  ('00000000-0000-4000-8006-000000000001', '00000000-0000-4000-8005-000000000001', 'user',
   'My knee is swollen three weeks after an ACL repair. Normal?', '[]'::jsonb, null, null, null, null, null, null, now() - interval '30 minutes'),
  ('00000000-0000-4000-8006-000000000002', '00000000-0000-4000-8005-000000000001', 'assistant',
   E'Usually, yes. Three weeks out, swelling that''s worse at night after a busy day and better in the morning is the knee doing its job [1]. What Maria tells patients to watch for instead: swelling that''s warm to the touch, that came on fast, or that comes with calf pain. Any of those means a phone call to the surgeon''s office, not a home exercise [1][2].\n\nIf the pattern is the normal one, the protocol she uses is ice after activity and keeping the quad set count up, not resting more [3].\n\nHealth information, not medical care. If you''re unsure, Maria''s contact link is at the top.',
   '[{"n":1,"chunkId":"00000000-0000-4000-8004-000000000001","sourceType":"interview","sourceName":"Interview answers","question":"When someone comes in three weeks after an ACL repair worried about swelling, what do you look at first?","page":null,"headingPath":null},{"n":2,"chunkId":"00000000-0000-4000-8004-000000000002","sourceType":"interview","sourceName":"Interview answers","question":"How do you tell a patient what counts as warm?","page":null,"headingPath":null},{"n":3,"chunkId":"00000000-0000-4000-8004-000000000003","sourceType":"document","sourceName":"ACL-rehab-protocol.pdf","question":null,"page":3,"headingPath":"Weeks 2-6 › Swelling"}]'::jsonb,
   'up', 4, 6200, 410, 'claude-sonnet-5', 2300, now() - interval '29 minutes'),
  ('00000000-0000-4000-8006-000000000003', '00000000-0000-4000-8005-000000000001', 'user',
   'What counts as "warm"?', '[]'::jsonb, null, null, null, null, null, null, now() - interval '20 minutes'),
  ('00000000-0000-4000-8006-000000000004', '00000000-0000-4000-8005-000000000001', 'assistant',
   'Maria''s rule of thumb: compare it with the other knee with the back of your hand. Noticeably warmer than the other side, plus redness, is the combination she cares about [1]. Warm alone right after exercise is expected.',
   '[{"n":1,"chunkId":"00000000-0000-4000-8004-000000000002","sourceType":"interview","sourceName":"Interview answers","question":"How do you tell a patient what counts as warm?","page":null,"headingPath":null}]'::jsonb,
   null, 4, 6100, 180, 'claude-sonnet-5', 1800, now() - interval '19 minutes'),
  ('00000000-0000-4000-8006-000000000005', '00000000-0000-4000-8005-000000000001', 'user',
   'When can I start running again?', '[]'::jsonb, null, null, null, null, null, null, now() - interval '11 minutes'),
  ('00000000-0000-4000-8006-000000000006', '00000000-0000-4000-8005-000000000001', 'assistant',
   'Maria''s protocol uses three checks rather than a date: full knee extension, no swelling after a 30-minute walk, and a single-leg squat to about 60 degrees without the knee drifting inward [1]. Most people reach that somewhere after week 12, but the checks decide it, not the calendar.',
   '[{"n":1,"chunkId":"00000000-0000-4000-8004-000000000004","sourceType":"document","sourceName":"ACL-rehab-protocol.pdf","question":null,"page":7,"headingPath":"Return to running › Criteria"}]'::jsonb,
   'down', 4, 6300, 220, 'claude-sonnet-5', 2100, now() - interval '10 minutes'),

  -- Sam x Dev: Q3 estimate (2 replies x 3 credits)
  ('00000000-0000-4000-8006-000000000007', '00000000-0000-4000-8005-000000000002', 'user',
   'How much should I pay for my Q3 estimate? I made about $30k so far this year.', '[]'::jsonb, null, null, null, null, null, null, now() - interval '1 day 20 minutes'),
  ('00000000-0000-4000-8006-000000000008', '00000000-0000-4000-8005-000000000002', 'assistant',
   'Dev starts from the safe-harbor rule: if you pay 100% of last year''s total tax in four equal installments, you won''t owe a penalty even if this year is bigger [1]. If you don''t have last year''s number handy, he sets aside 25-30% of net profit for federal plus self-employment tax [2].',
   '[{"n":1,"chunkId":null,"sourceType":"interview","sourceName":"Interview answers","question":"How do you decide what a freelancer should pay each quarter?","page":null,"headingPath":null},{"n":2,"chunkId":null,"sourceType":"interview","sourceName":"Interview answers","question":"What percentage do you tell new freelancers to set aside?","page":null,"headingPath":null}]'::jsonb,
   'up', 3, 5400, 260, 'claude-sonnet-5', 2000, now() - interval '1 day 18 minutes'),
  ('00000000-0000-4000-8006-000000000009', '00000000-0000-4000-8005-000000000002', 'user',
   'Last year my total tax was $6,200.', '[]'::jsonb, null, null, null, null, null, null, now() - interval '1 day 5 minutes'),
  ('00000000-0000-4000-8006-000000000010', '00000000-0000-4000-8005-000000000002', 'assistant',
   'Then the safe-harbor payment is $1,550 per quarter, so $1,550 for Q3 if you''ve paid Q1 and Q2 [1]. If your income last year was above $150,000 the rule is 110%, which would not apply here.',
   '[{"n":1,"chunkId":null,"sourceType":"interview","sourceName":"Interview answers","question":"How do you decide what a freelancer should pay each quarter?","page":null,"headingPath":null}]'::jsonb,
   null, 3, 5500, 150, 'claude-sonnet-5', 1700, now() - interval '1 day'),

  -- Sam x Priya: essay feedback (2 replies x 3 credits)
  ('00000000-0000-4000-8006-000000000011', '00000000-0000-4000-8005-000000000003', 'user',
   'My essay starts with a quote from my grandmother. Is that a bad opening?', '[]'::jsonb, null, null, null, null, null, null, now() - interval '3 days 25 minutes'),
  ('00000000-0000-4000-8006-000000000012', '00000000-0000-4000-8005-000000000003', 'assistant',
   'Priya''s view is that the quote itself isn''t the problem; a reader skims past it looking for you [1]. Keep it only if the next sentence shows what you did with it.',
   '[{"n":1,"chunkId":null,"sourceType":"interview","sourceName":"Interview answers","question":"What makes an essay opening fail?","page":null,"headingPath":null}]'::jsonb,
   null, 3, 5200, 120, 'claude-sonnet-5', 1600, now() - interval '3 days 23 minutes'),
  ('00000000-0000-4000-8006-000000000013', '00000000-0000-4000-8005-000000000003', 'user',
   'Should I cut it then?', '[]'::jsonb, null, null, null, null, null, null, now() - interval '3 days 2 minutes'),
  ('00000000-0000-4000-8006-000000000014', '00000000-0000-4000-8005-000000000003', 'assistant',
   'Try moving it to the end. Priya often has students open on a moment instead, then let the quote land after the reader knows why it mattered [1].',
   '[{"n":1,"chunkId":null,"sourceType":"interview","sourceName":"Interview answers","question":"What makes an essay opening fail?","page":null,"headingPath":null}]'::jsonb,
   null, 3, 5300, 110, 'claude-sonnet-5', 1500, now() - interval '3 days'),

  -- Jordan x Maria: shoulder plan (2 replies x 4 credits)
  ('00000000-0000-4000-8006-000000000015', '00000000-0000-4000-8005-000000000004', 'user',
   'What does a good week of shoulder rehab look like?', '[]'::jsonb, null, null, null, null, null, null, now() - interval '4 days 30 minutes'),
  ('00000000-0000-4000-8006-000000000016', '00000000-0000-4000-8005-000000000004', 'assistant',
   'Maria plans shoulder weeks around three short sessions of band work and one longer session, with rest days between the harder ones [1].',
   '[{"n":1,"chunkId":null,"sourceType":"interview","sourceName":"Interview answers","question":"How do you structure a week of shoulder rehab?","page":null,"headingPath":null}]'::jsonb,
   null, 4, 6000, 140, 'claude-sonnet-5', 1900, now() - interval '4 days 28 minutes'),
  ('00000000-0000-4000-8006-000000000017', '00000000-0000-4000-8005-000000000004', 'user',
   'How long should each band session be?', '[]'::jsonb, null, null, null, null, null, null, now() - interval '4 days 5 minutes'),
  ('00000000-0000-4000-8006-000000000018', '00000000-0000-4000-8005-000000000004', 'assistant',
   'Fifteen to twenty minutes. Maria would rather see four short sessions done than two long ones skipped [1].',
   '[{"n":1,"chunkId":null,"sourceType":"interview","sourceName":"Interview answers","question":"How do you structure a week of shoulder rehab?","page":null,"headingPath":null}]'::jsonb,
   'down', 4, 6050, 90, 'claude-sonnet-5', 1400, now() - interval '4 days'),

  -- Alex x Maria: shin splints (1 reply x 4 credits)
  ('00000000-0000-4000-8006-000000000019', '00000000-0000-4000-8005-000000000005', 'user',
   'How do I get back to running without wrecking my shins again?', '[]'::jsonb, null, null, null, null, null, null, now() - interval '2 days 15 minutes'),
  ('00000000-0000-4000-8006-000000000020', '00000000-0000-4000-8005-000000000005', 'assistant',
   'Start with the criteria Maria uses before any return to running [1], then build volume slowly: she''d cut a long run by a third for two weeks before changing anything about form.',
   '[{"n":1,"chunkId":"00000000-0000-4000-8004-000000000004","sourceType":"document","sourceName":"ACL-rehab-protocol.pdf","question":null,"page":7,"headingPath":"Return to running › Criteria"}]'::jsonb,
   null, 4, 6100, 130, 'claude-sonnet-5', 1700, now() - interval '2 days')
on conflict (id) do nothing;

-- ratings -----------------------------------------------------------------
insert into public.ratings (id, agent_id, hirer_id, stars, created_at) values
  ('00000000-0000-4000-8011-000000000001', '00000000-0000-4000-8002-000000000001', '00000000-0000-4000-8001-000000000002', 5, now() - interval '5 minutes'),
  ('00000000-0000-4000-8011-000000000002', '00000000-0000-4000-8002-000000000002', '00000000-0000-4000-8001-000000000002', 4, now() - interval '23 hours')
on conflict (id) do nothing;

-- wallets (balance = sum of the identity's ledger rows below) --------------
insert into public.wallets (identity_id, balance_cents, reserved_cents) values
  ('00000000-0000-4000-8001-000000000001', 5000, 0),
  ('00000000-0000-4000-8001-000000000002', 5000, 0),
  ('00000000-0000-4000-8001-000000000003', 5002, 0),
  ('00000000-0000-4000-8001-000000000004', 5002, 0),
  ('00000000-0000-4000-8001-000000000005', 5000, 0),
  ('00000000-0000-4000-8001-000000000006', 5000, 0),
  ('00000000-0000-4000-8001-000000000007', 5000, 0),
  ('00000000-0000-4000-8001-000000000008', 4992, 0),
  ('00000000-0000-4000-8001-000000000009', 4996, 0)
on conflict (identity_id) do nothing;

-- ledger ------------------------------------------------------------------
-- Usage charges per conversation: hirer debit = platform cost + platform margin + expert earnings
--   conv 01: 12 = 6 + 1 + 5   conv 02: 6 = 4 + 0 + 2   conv 03: 6 = 4 + 0 + 2
--   conv 04:  8 = 4 + 1 + 3   conv 05: 4 = 2 + 0 + 2
insert into public.ledger (id, identity_id, kind, amount_cents, balance_after, purpose, ref_type, ref_id, note, created_at) values
  -- Maria Chen (expert): ends at 5,000
  ('00000000-0000-4000-8009-000000000001', '00000000-0000-4000-8001-000000000001', 'seed',         2093, 2093, null, null, null, 'Starting balance', now() - interval '25 days'),
  ('00000000-0000-4000-8009-000000000002', '00000000-0000-4000-8001-000000000001', 'subscription', 2000, 4093, null, null, null, 'Mock monthly plan · no payment taken', now() - interval '14 days'),
  ('00000000-0000-4000-8009-000000000003', '00000000-0000-4000-8001-000000000001', 'pack',         1000, 5093, null, null, null, 'Mock credit pack · no payment taken', now() - interval '6 days'),
  ('00000000-0000-4000-8009-000000000004', '00000000-0000-4000-8001-000000000001', 'debit',          -9, 5084, 'embedding',       'source',            '00000000-0000-4000-8003-000000000002', 'ACL-rehab-protocol.pdf · 42 chunks', now() - interval '5 days'),
  ('00000000-0000-4000-8009-000000000005', '00000000-0000-4000-8001-000000000001', 'debit',         -76, 5008, 'interview_turn',  'interview_session', '00000000-0000-4000-8007-000000000001', 'Physical therapy interview · 38 answers', now() - interval '4 days 22 hours'),
  ('00000000-0000-4000-8009-000000000006', '00000000-0000-4000-8001-000000000001', 'earnings',        3, 5011, null, 'conversation', '00000000-0000-4000-8005-000000000004', 'Shoulder rehab week plan · net', now() - interval '4 days'),
  ('00000000-0000-4000-8009-000000000007', '00000000-0000-4000-8001-000000000001', 'debit',          -6, 5005, 'sandbox_message', 'agent',             '00000000-0000-4000-8002-000000000001', 'Sandbox · 2 test messages', now() - interval '3 days'),
  ('00000000-0000-4000-8009-000000000008', '00000000-0000-4000-8001-000000000001', 'earnings',        2, 5007, null, 'conversation', '00000000-0000-4000-8005-000000000005', 'Return to running after shin splints · net', now() - interval '2 days'),
  ('00000000-0000-4000-8009-000000000009', '00000000-0000-4000-8001-000000000001', 'debit',         -12, 4995, 'interview_turn',  'interview_session', '00000000-0000-4000-8007-000000000002', 'Running form clinic · 6 answers', now() - interval '1 day'),
  ('00000000-0000-4000-8009-000000000010', '00000000-0000-4000-8001-000000000001', 'earnings',        5, 5000, null, 'conversation', '00000000-0000-4000-8005-000000000001', 'Knee swelling after ACL repair · net', now() - interval '9 minutes'),
  -- Sam Okafor (hirer): ends at 5,000
  ('00000000-0000-4000-8009-000000000011', '00000000-0000-4000-8001-000000000002', 'seed',         2024, 2024, null, null, null, 'Starting balance', now() - interval '25 days'),
  ('00000000-0000-4000-8009-000000000012', '00000000-0000-4000-8001-000000000002', 'subscription', 2000, 4024, null, null, null, 'Mock monthly plan · no payment taken', now() - interval '14 days'),
  ('00000000-0000-4000-8009-000000000013', '00000000-0000-4000-8001-000000000002', 'pack',         1000, 5024, null, null, null, 'Mock credit pack · no payment taken', now() - interval '6 days'),
  ('00000000-0000-4000-8009-000000000014', '00000000-0000-4000-8001-000000000002', 'debit',          -6, 5018, 'chat_message', 'conversation', '00000000-0000-4000-8005-000000000003', 'Priya Nair · College admissions · 2 messages', now() - interval '3 days'),
  ('00000000-0000-4000-8009-000000000015', '00000000-0000-4000-8001-000000000002', 'debit',          -6, 5012, 'chat_message', 'conversation', '00000000-0000-4000-8005-000000000002', 'Dev Patel · Tax for freelancers · 2 messages', now() - interval '1 day'),
  ('00000000-0000-4000-8009-000000000016', '00000000-0000-4000-8001-000000000002', 'debit',         -12, 5000, 'chat_message', 'conversation', '00000000-0000-4000-8005-000000000001', 'Maria Chen · Physical therapy · 3 messages', now() - interval '10 minutes'),
  -- other seeded people
  ('00000000-0000-4000-8009-000000000017', '00000000-0000-4000-8001-000000000003', 'seed', 5000, 5000, null, null, null, 'Starting balance', now() - interval '25 days'),
  ('00000000-0000-4000-8009-000000000018', '00000000-0000-4000-8001-000000000004', 'seed', 5000, 5000, null, null, null, 'Starting balance', now() - interval '25 days'),
  ('00000000-0000-4000-8009-000000000019', '00000000-0000-4000-8001-000000000005', 'seed', 5000, 5000, null, null, null, 'Starting balance', now() - interval '25 days'),
  ('00000000-0000-4000-8009-000000000020', '00000000-0000-4000-8001-000000000006', 'seed', 5000, 5000, null, null, null, 'Starting balance', now() - interval '25 days'),
  ('00000000-0000-4000-8009-000000000021', '00000000-0000-4000-8001-000000000007', 'seed', 5000, 5000, null, null, null, 'Starting balance', now() - interval '25 days'),
  ('00000000-0000-4000-8009-000000000022', '00000000-0000-4000-8001-000000000008', 'seed', 5000, 5000, null, null, null, 'Starting balance', now() - interval '25 days'),
  ('00000000-0000-4000-8009-000000000023', '00000000-0000-4000-8001-000000000009', 'seed', 5000, 5000, null, null, null, 'Starting balance', now() - interval '25 days'),
  ('00000000-0000-4000-8009-000000000024', '00000000-0000-4000-8001-000000000008', 'debit',   -8, 4992, 'chat_message', 'conversation', '00000000-0000-4000-8005-000000000004', 'Maria Chen · Physical therapy · 2 messages', now() - interval '4 days 10 minutes'),
  ('00000000-0000-4000-8009-000000000025', '00000000-0000-4000-8001-000000000009', 'debit',   -4, 4996, 'chat_message', 'conversation', '00000000-0000-4000-8005-000000000005', 'Maria Chen · Physical therapy · 1 message', now() - interval '2 days 10 minutes'),
  ('00000000-0000-4000-8009-000000000026', '00000000-0000-4000-8001-000000000003', 'earnings', 2, 5002, null, 'conversation', '00000000-0000-4000-8005-000000000002', 'Quarterly estimate for Q3 · net', now() - interval '1 day'),
  ('00000000-0000-4000-8009-000000000027', '00000000-0000-4000-8001-000000000004', 'earnings', 2, 5002, null, 'conversation', '00000000-0000-4000-8005-000000000003', 'Essay draft feedback · net', now() - interval '3 days'),
  -- platform share (no identity)
  ('00000000-0000-4000-8009-000000000028', null, 'platform_cost',   6, null, 'chat_message', 'conversation', '00000000-0000-4000-8005-000000000001', 'Raw LLM cost', now() - interval '9 minutes'),
  ('00000000-0000-4000-8009-000000000029', null, 'platform_margin', 1, null, 'chat_message', 'conversation', '00000000-0000-4000-8005-000000000001', '15% of margin', now() - interval '9 minutes'),
  ('00000000-0000-4000-8009-000000000030', null, 'platform_cost',   4, null, 'chat_message', 'conversation', '00000000-0000-4000-8005-000000000002', 'Raw LLM cost', now() - interval '1 day'),
  ('00000000-0000-4000-8009-000000000031', null, 'platform_cost',   4, null, 'chat_message', 'conversation', '00000000-0000-4000-8005-000000000003', 'Raw LLM cost', now() - interval '3 days'),
  ('00000000-0000-4000-8009-000000000032', null, 'platform_cost',   4, null, 'chat_message', 'conversation', '00000000-0000-4000-8005-000000000004', 'Raw LLM cost', now() - interval '4 days'),
  ('00000000-0000-4000-8009-000000000033', null, 'platform_margin', 1, null, 'chat_message', 'conversation', '00000000-0000-4000-8005-000000000004', '15% of margin', now() - interval '4 days'),
  ('00000000-0000-4000-8009-000000000034', null, 'platform_cost',   2, null, 'chat_message', 'conversation', '00000000-0000-4000-8005-000000000005', 'Raw LLM cost', now() - interval '2 days')
on conflict (id) do nothing;

-- llm_usage (raw cost per metered call group) ------------------------------
insert into public.llm_usage (id, identity_id, agent_id, conversation_id, purpose, model, tokens_in, tokens_out, cache_read_tokens, cost_cents, latency_ms, created_at) values
  ('00000000-0000-4000-8010-000000000001', '00000000-0000-4000-8001-000000000001', '00000000-0000-4000-8002-000000000001', null, 'embedding',       'voyage-4-lite',   430000, 0,     0, 8.6000,  9200, now() - interval '5 days'),
  ('00000000-0000-4000-8010-000000000002', '00000000-0000-4000-8001-000000000001', '00000000-0000-4000-8002-000000000001', null, 'interview_turn',  'claude-sonnet-5', 310000, 13800, 0, 75.8000, 2600, now() - interval '4 days 22 hours'),
  ('00000000-0000-4000-8010-000000000003', '00000000-0000-4000-8001-000000000001', '00000000-0000-4000-8002-000000000001', null, 'sandbox_message', 'claude-sonnet-5', 24000,  800,   0, 5.6000,  2100, now() - interval '3 days'),
  ('00000000-0000-4000-8010-000000000004', '00000000-0000-4000-8001-000000000001', '00000000-0000-4000-8002-000000000007', null, 'interview_turn',  'claude-sonnet-5', 48000,  2200,  0, 11.8000, 2400, now() - interval '1 day'),
  ('00000000-0000-4000-8010-000000000005', '00000000-0000-4000-8001-000000000002', '00000000-0000-4000-8002-000000000001', '00000000-0000-4000-8005-000000000001', 'chat_message', 'claude-sonnet-5', 18600, 810, 0, 5.5300, 2067, now() - interval '10 minutes'),
  ('00000000-0000-4000-8010-000000000006', '00000000-0000-4000-8001-000000000002', '00000000-0000-4000-8002-000000000002', '00000000-0000-4000-8005-000000000002', 'chat_message', 'claude-sonnet-5', 10900, 410, 0, 2.5900, 1850, now() - interval '1 day'),
  ('00000000-0000-4000-8010-000000000007', '00000000-0000-4000-8001-000000000002', '00000000-0000-4000-8002-000000000003', '00000000-0000-4000-8005-000000000003', 'chat_message', 'claude-sonnet-5', 10500, 230, 0, 2.3300, 1550, now() - interval '3 days'),
  ('00000000-0000-4000-8010-000000000008', '00000000-0000-4000-8001-000000000008', '00000000-0000-4000-8002-000000000001', '00000000-0000-4000-8005-000000000004', 'chat_message', 'claude-sonnet-5', 12050, 230, 0, 2.6400, 1650, now() - interval '4 days'),
  ('00000000-0000-4000-8010-000000000009', '00000000-0000-4000-8001-000000000009', '00000000-0000-4000-8002-000000000001', '00000000-0000-4000-8005-000000000005', 'chat_message', 'claude-sonnet-5', 6100,  130,   0, 1.3500,  1700, now() - interval '2 days')
on conflict (id) do nothing;
