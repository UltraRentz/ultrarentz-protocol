UltraRentz at ETHGlobal Mumbai: Hour-by-Hour Plan

Window: Thu 5 Nov 18:30 to Sat 7 Nov 06:30 (Istanbul time) = Thu 21:00 to Sat 09:00 (Mumbai time). 36 hours. Mumbai time = Istanbul time + 2:30. Check your phone and laptop clocks.

Entries (three partner picks):

Arc: Arc Studio Continuity Track
Arkiv: Build on Arkiv (existing projects)
World: World ID Agent Pass, Continuity Backup for World: Chainlink CRE (decide by Fri 14:00).

The one story (everything serves this): a tenant finishes a tenancy cleanly, gets a verifiable Deposit Passport, and rolls the deposit into a new tenancy, with a human approval step. Money and rules on Arc, records on Arkiv, human check with World.

Ground rules

No feature code before 18:30 Thu. Setup and spec only.
Commit and push at least every hour (judges look for steady progress). Commit messages end with the Claude co-author line when I helped.
Keep a friction log (plain text, timestamped) all weekend. It feeds Arkiv's friction.md, World's debrief and Whitechain-style feedback.
Stuck for more than 30 minutes on one thing: ask a mentor or booth, don't grind alone.
Eat when food is served. Sleep as planned.
Thursday 5 Nov
Istanbul	Mumbai	Task	Done when
18:30 to 19:00	21:00 to 21:30	Arc Studio: create a project, import the vault, copy the shareable URL. Commit "Hackathon start". Start the friction log.	Studio URL works for someone else
19:00 to 19:30	21:30 to 22:00	Spec the Passport on one page, no code: states, functions, events, the rollover conditions, the approval signature check, replay protection	One page saved in the repo
19:30 to 21:30	22:00 to 00:00	Contract in Studio: record a clean-tenancy outcome (with a record hash), rollover(oldLease, newLease, approvalSig)	Compiles in Studio
21:30 to 21:45	00:00 to 00:15	Late-night snack (Catering Area, around 21:29)	
21:45 to 23:15	00:15 to 01:45	Foundry tests: happy path, dispute blocks rollover, bad signature rejected, replay rejected	Tests pass
23:15 to 23:45	01:45 to 02:15	Deploy to Arc testnet. Save addresses and tx hashes. Update PRE_EXISTING.md. Commit and push.	Rollover works on testnet
23:45 to 00:00	02:15 to 02:30	Wrap up. Write tomorrow's first three tasks. Send the tracked link and the 3 questions to your network (15 min) so replies arrive while you sleep.	Messages sent

Checkpoint 1 (Thu 23:45): if the contract isn't deployed, cut extra edge-case tests, not the deployment.

Friday 6 Nov
Istanbul	Mumbai	Task	Done when
00:00 to 04:00	02:30 to 06:30	Sleep.	
04:00 to 04:30	06:30 to 07:00	Arkiv setup: faucet, access key, SDK hello-world (write and read one entity)	One entity written and read back
04:30 to 06:30	07:00 to 09:00	Arkiv schema and writes: evidence entity, passport entity, expiry, queryable attributes. Write script in the repo.	Both entity types written on testnet
06:30 to 07:30	09:00 to 10:00	Read path: passport lookup by tenant wallet, and the Verify logic (fetch from Arkiv RPC, hash, compare with the hash on Arc)	Lookup and verify work in a script
07:30 to 08:00	10:00 to 10:30	Brunch (The Dosa Social)	
08:00 to 09:00	10:30 to 11:30	Verify button in the UI and the tamper test (change a field, watch it fail)	Tamper test fails correctly
09:00 to 09:30	11:30 to 12:00	Checkpoint 2: Arc and Arkiv working end to end? Then deploy the existing demo to Vercel (free) so people can try it on their phones.	Yes or a clear fix list, and a public demo link
09:30 to 10:30	12:00 to 13:00	Booth round: Arc, Arkiv, World. Show progress, ask your open questions, note names.	
10:30 to 12:30	13:00 to 15:00	World Agent Pass: read docs, note your start time, mocked proof, serverless backend that validates and signs the approval, note first-success time	First validated approval
12:30 to 13:30	15:00 to 16:00	Wire the approval into rollover: contract checks the signature, UI gate, denied or expired path blocks the action	Denied path demonstrably blocks
13:30 to 14:00	16:00 to 16:30	MVP test session 1: 5 people at the venue try the live demo on their phones (3 questions, see "Users and testing")	5 recorded responses
14:00 to 14:15	16:30 to 16:45	Checkpoint 3 (World go/no-go): if World has no first success yet, ask the booth now. By 14:30 decide: keep going, or swap to Chainlink CRE.	Decision made
14:15 to 15:30	16:45 to 18:00	End-to-end run: tenancy, release, passport, new lease, human approval, rollover. Fix bugs. Commit and push.	The whole path runs
15:30 to 16:15	18:00 to 18:45	Dinner (The Diwali Feast)	
16:15 to 18:00	18:45 to 20:30	MVP test session 2 (30 min) with 3 new people on the new flow, then front-end polish: fix the top three problems they hit, mobile layout, error states	Top 3 issues fixed
18:00 to 19:30	20:30 to 22:00	Docs: README (before and during, architecture, setup), PRE_EXISTING.md, the five /arkiv/*.md files, the World debrief, the architecture diagram	All files in the repo
19:30 to 21:30	22:00 to 00:00	Spare time: fix bugs, or the optional Swarm bonus only if everything else is green	
21:30	00:00	Feature freeze. No new features after this. Late-night snack around 21:29.	
21:30 to 23:00	00:00 to 01:30	Demo video: script, rehearse, record a first take, re-record if needed. Show Studio, Arkiv, the World denied path, the tamper test.	Video file saved
23:00 to 00:00	01:30 to 02:30	Final deploy check, tag hackathon-submission, push	Tag pushed
Saturday 7 Nov
Istanbul	Mumbai	Task	Done when
00:00 to 03:00	02:30 to 05:30	Sleep.	
03:00 to 05:00	05:30 to 07:30	Submission form (partners, descriptions, links, bounty statements, videos, Studio URL). Then test from a fresh clone to confirm README steps work.	Form complete, clone test passes
05:00 to 05:30	07:30 to 08:00	SUBMIT. Target is one hour before the deadline.	Submitted
05:30	08:00	Breakfast (Sunrise and Sambar)	
06:30	09:00	DEADLINE. Changes only if something is broken.	
07:00	09:30	Partner judging at booths: be at Arc, Arkiv and World with the demo open. Also finalist judging rooms.	
10:00	12:30	Lunch (The Biryani Send-Off)	
12:45	15:15	Finalists notified	
13:00	15:30	Closing ceremonies	
Users and testing (about 3 hours in total, built into the table)

Why: real users and real feedback score under Arkiv's "reach", help the Continuity prizes, and tell you whether the demo makes sense to someone who has never seen it.

Who

Tenants: hackathon attendees, volunteers and venue staff who rent. Ask at meals (brunch 07:30, dinner 15:30 Istanbul) and in the queue areas.
Landlords: ask "do you let property, or know someone who does?" Use your property-sourcing contacts by phone or WhatsApp while you eat. Two real conversations are enough.
Students: your Hertfordshire waitlist and Leeds contacts, by message, with the tracked link.

The three questions (same every time)

How much was your last deposit, and did you get it all back?
After trying the demo: what did you think happened to your money?
Would you use this, and what would stop you?

How to record: one line per person in a sheet or notes file: who (renter, landlord, student), source tag, answers, one quote. Count them.

What you may claim: only the numbers and quotes you actually collect, labelled honestly (for example "7 people tested the practice-money demo at ETHGlobal Mumbai").

Cost and trade-off: about 3 hours come out of build time. They are paid for by shrinking the spare time on Friday evening and by using meals. If you fall behind on Friday at 14:00, shorten session 2, never skip session 1.

Cut list (in this order)
Swarm bonus
World denied-path polish (keep the denied path itself)
Front-end polish
Extra edge-case tests

Never cut: the Arc contract, the Arkiv Verify, the video, the submission form, and the fresh-clone test.

Submission checklist
 Studio project URL, shareable, shown in the video
 Architecture diagram
 Public repo with an open-source licence, a README, PRE_EXISTING.md, and a statement of how AI was used
 Arkiv: README wallet addresses and a runnable query, plus /arkiv/schema.md, friction.md, reach.md, why-arkiv.md, how-you-use-arkiv.md
 World: validated backend, a denied path, a short debrief (time to first success, friction, missing docs, top improvement), a note that proofs are mocked
 Arc: bounty named as "Arc Studio Continuity Track", before-and-after clear
 Demo video showing each party and the key moments
 Honest limits stated: testnet only, simulated yield, unaudited