# Mina 2.0: Privacy Preserving Programmability Layer for Web2 and Web3

---

## The Bet

We (re)build Mina around a single, uncompromising thesis: **programmable privacy
as public infrastructure.** Selective disclosure. Client-side execution.
Verification without surveillance. A full node in every browser. The canonical
registry where proven facts from any chain become composable, persistent and
universally verifiable.

These aren't new ideas, they're _our_ ideas - the ones we pioneered, the ones
the market is finally catching up to and the ones we never fully executed on.
Mina 2.0 is the commitment to finish what we started - with the hard lessons of
the last few years behind us, the conviction to move faster than we ever have,
and for the first time in history, the tools to make a small team move like an
army.

This is a 5–10 year vision. It's supposed to be big. Use cases, PoCs and roadmap
details will follow. But the direction must be set now.

---

## Why This, Why Now

**The world finally wants what we built Mina to provide.**

a16z declared privacy "the most important moat in crypto" for 2026. eIDAS 2.0 is
rolling out digital identity wallets across the EU. MiCA is creating compliance
frameworks that _require_ selective disclosure. ZEC rallied 800%+ in 2025. The
SEC hosted a roundtable on "Financial Surveillance and Privacy" in
December 2025. The demand is no longer theoretical - it's regulatory,
institutional and accelerating.

**The competition is fighting over the wrong hill.**

Aztec, Aleo, Starknet, the zkVM wars - they're all competing on execution.
Rollups, L2s, throughput benchmarks. That space is commoditizing in real time.
Meanwhile, _privacy as native infrastructure_ - verification without disclosure,
client-side proving, metadata minimization, a full node in the browser - remains
wide open. No one else has this architecture. No one else _can_ have it without
starting from where we started a decade ago.

**We've earned the scars to know what doesn't work.**

Throughout the years, developers struggled with half-finished tooling. Community
trust eroding under slow delivery and unclear direction. We know exactly what
went wrong: implicit focus drift, too many parallel bets, perfection over
shipping. But here's the harder truth - the technology was never the real
blocker. The ideas were always right. The architecture was always right. What
was missing was the _will_ to commit, to make hard tradeoffs and to ship
imperfect things fast while catching up to the rest of the industry. Mina 2.0 is
the explicit, honest correction - starting with the will.

**Mina needs a leader. It's time for o1labs to step up.**

With the Mina Foundation gone, there is no ambiguity left about who must drive
this forward. The ecosystem needs clarity, direction and visible commitment.
o1labs built this protocol. o1labs understands it better than anyone. And o1labs
must now own it - not just technically, but strategically, publicly and
culturally. This is our responsibility and it's also our opportunity.

**AI changes what's possible with a small, focused team.**

This is the part nobody in the ecosystem is talking about yet. The engineering
landscape has fundamentally shifted. Coding agents, AI-assisted development and
modern tooling don't add 10% - they multiply output by 5–10x. What took 50
engineers 3 years now takes 20 engineers 1 year. A protocol rewrite that would
have been suicide two years ago is now a serious option. A team our size, with
full conviction, modern tools and relentless focus, can out-ship teams five
times larger that are spread across committees and consensus processes. This is
our structural advantage - and we should exploit it ruthlessly. (Thanks Martin
for demonstrating this)

> The downside of bold direction is already priced in. The upside of committing
> is disproportionately large.

---

## The Core Thesis

> **Mina is not where everything runs. Mina is where everything is verified.**

Mina 2.0 plays three roles - each reinforcing the others:

### 1. Privacy Application Platform

The foundation. zkApps enable a fundamentally different model of computation:
logic executes client-side, correctness is proven cryptographically, the chain
only verifies. No identities, no raw data, no intent revealed - only
correctness. Mina becomes the platform where privacy-preserving applications are
not just possible but _natural_.

### 2. Cross-Chain Verification Layer - The Registry of Proven Facts

Mina becomes the canonical place where proofs from any chain - Ethereum, Zcash,
Solana, off-chain systems - are verified and stored as persistent, composable
facts. Not verification-as-a-service that forgets what it verified. Verification
with _state_. A credit score proven on Ethereum gets recorded on Mina and now
any application on any chain can reference that fact - without re-proving,
without trusting a third party, without syncing anything heavier than 22KB.
zkVerify and Aligned Layer verify and forget. Mina verifies and _remembers_.

### 3. Programmability Layer for Privacy-Native Chains - Starting with Zcash

Zcash has the strongest privacy cryptography in the industry, a $4B market cap,
exchange listings on Coinbase, Kraken and Gemini and a community that has been
asking for programmability for _years_. Zcash can send and receive - but it
can't do DeFi, governance, credentials, or any programmable application. Mina
provides exactly what Zcash is missing. Same cryptographic DNA (shared Pasta
curve cycle), complementary rather than competitive and a narrative the market
understands in one sentence: _the smart contract layer that privacy has been
waiting for._ Zcash brings the anonymity set, the credibility and the users.
Mina brings the programmability, the verification and the developer tooling.
Together, they create something neither can achieve alone.

**Together, these three roles create Mina's position:** not another L1 competing
on execution, but the **privacy and verification infrastructure layer that other
chains and systems plug into.** The courtroom where proofs are the evidence -
from Mina's own zkApps, from Zcash's shielded transactions, from Ethereum's
rollups, from off-chain systems we haven't imagined yet.

Zero-knowledge protects _what is revealed._ The browser node protects _who you
must trust._ The verification layer makes it _universally composable._

---

## The Grand Vision: What Mina 2.0 Becomes

Imagine a world where:

- A user proves they're eligible for a service without revealing a single piece
  of personal data - and the verification happens in their browser, with no
  server involved
- A financial application runs confidential transactions on a public chain, with
  full regulatory auditability but zero public exposure
- A Zcash holder uses their shielded balance as collateral in a DeFi protocol -
  privately, programmably, without ever leaving the privacy set
- A proven fact on Mina - a credit score, a compliance check, an identity
  credential - is referenced by applications on Ethereum, Solana and Cosmos
  simultaneously, without re-proving and without trust
- Developers build privacy-preserving applications in TypeScript, with proving
  fast enough to feel invisible and composability built into the protocol
- An entire ecosystem of applications coordinates trustlessly - each verifying
  the others' outputs without ever seeing their internal state

This is where Mina 2.0 leads. Not all of it ships in year one. But all of it
becomes possible because of the architectural choices we make now.

**This is a grand vision - and we're not waiting to start building it.** The
difference between Mina 2.0 and every previous approach is that we're already
moving. The point of this document is to set the direction is to make all
previous approaches coherent - and to give us permission to go faster.

---

## A Two-Step Strategy

Step 1: Execute, Ship, Prove It

The near-term goal is to restore relevance, momentum, and credibility through
relentless execution. The mindset shift: We've spent years optimizing for ideal
properties - full decentralization, minimal trust, theoretical purity. Those
remain our north star. But we've learned the hard way that perfect systems
shipped too late don't matter. Mina 2.0 sequences guarantees over time: make it
work, make it real, then make it perfect. This phase answers the hard
questions - and then ships the answers:

Do we drop the old node and go all-in on Rust? Do we rewrite from scratch or
evolve what we have? What proof system takes us into the next decade? Do we
adopt, adapt, or build? What are the exact protocol features that unblock real
applications - and in what order? What does the zkApp developer experience need
to look like for people to actually ship products? Which partnerships - Zcash,
institutional players, cross-chain integrations - move the needle fastest? What
PoCs validate the thesis with real users and real revenue?

We don't have all the answers yet. But we have the direction, the conviction,
and the team to figure them out - fast. The details get scoped, debated, and
decided in the first weeks. Then we execute. Step 1 earns us the right to pursue
Step 2.

**Without near-term execution, the long-term endgame never materializes.**

Step 2: The Endgame - Privacy-First Public Infrastructure

If Step 1 succeeds, Mina becomes what it was always meant to be: privacy-first
public infrastructure for the multi-chain world. A general-purpose zkApp
platform earned through adoption. The canonical verification layer where proven
facts are stored and composed across chains. The programmability backbone for
privacy-native ecosystems. A self-sustaining system with real users, real
revenue, and real momentum. The endgame cannot be declared. It must be earned.

---

## Already In Motion

Here's what's different about Mina 2.0: **we don't wait for the protocol to
change on its own before we build on it.**

We already have concrete PoCs in flight that validate this vision -
privacy-preserving trust infrastructure for AI agents, ZK-powered dark pools for
institutional finance, credential systems, compliance tooling. These were meant
as seperate products, but they validate Mina's thesis perfectly. They coexist
naturally with the direction outlined here. Each one tests a different dimension
of Mina's value proposition against real market demand and each one is being
built _on Mina as it exists today._

We are no longer paralyzed by our own tech. We take a proactive stance. We lead.
We ship - and shipping teaches us what to build next.

---

## The Hard Question: Fix or Rebuild?

Let's be honest about something we've danced around internally for too long.

Mina's current protocol carries years of accumulated complexity, technical debt,
and architectural decisions that were right at the time but constrain us now. We
can keep patching - or we can ask the harder question:

**Should we fork and rewrite?**

Not a cosmetic rebrand. A genuine technical reset - taking everything we've
learned about protocol design, zkApp architecture and what developers actually
need and rebuilding on a modern foundation.

Two years ago, this would have been impossible. Today, it's a serious option -
because the engineering equation has changed.

### AI makes the rewrite viable

We are living through the most significant shift in software engineering
productivity in decades. Coding agents don't just autocomplete - they write
implementations, refactor systems, generate tests and iterate on architecture. A
focused team of 20 engineers with modern AI tooling has the effective output of
a team of 50+ working traditionally. The rewrite that would have taken 3 years
now takes 12–18 months.

This isn't speculative. We see it in our own workflows already. The question is
whether we apply this leverage to patching a constrained system - or to building
the one we actually want.

### What a rewrite unlocks

**A unified Rust stack.** The browser node work is already happening in Rust. If
we commit to Rust as the single node implementation - browser and full node on
the same codebase - we eliminate the OCaml/Rust split that has fragmented our
velocity for years. One language, one team, one codebase. Faster iteration,
better tooling, broader contributor base. This not only spans across the node
teams, but across the entire company. Node, cryptography, o1js, products, proof
of concepts. They all become viable. They all become easy.

**State-of-the-art proof systems.** The ZK landscape has evolved dramatically.
Folding schemes, modern zkVMs, next-generation proof systems - we should
seriously evaluate integrating the best of what exists today rather than
maintaining legacy proving infrastructure. A rewrite gives us the freedom to
make that choice cleanly.

**A protocol designed for zkApps, not retrofitted for them.** The current
protocol lacks a lot of core fundamental zkApps features. A rewrite lets us
build fee authorization, private state models, improved on-chain storage and
zkApp composability as first-class protocol features rather than afterthoughts
bolted onto the SDK as an unpleasesant developer experience.

**A signal to the community and the market.** A rewrite and commitment says: _we
are serious. We are not incrementally maintaining a legacy system. We are
building the next generation._ That signal matters - for developers evaluating
where to build, for protocols and businesses evaluating who to partner with, for
the community that has been waiting for o1labs to lead decisively.

This is not a decision to make lightly. It's a decision to make _explicitly_ -
and with conviction. The design is done - that's the hard part. We know what
Mina should be. We've known for a while. The question is whether we finally have
the will to execute on that knowledge or keep working around the edges.

> It's better to ship systems that are imperfect but moving fast than to
> maintain "perfect" systems that can't evolve.

---

## zkApps: Done Right This Time

zkApps are the heart of Mina's value proposition. They are what makes Mina
_useful_, not just interesting. And they need serious, focused investment to
become production-ready.

**What's broken and what we fix:**

**(non-exhaustive list)**

**The mental model.** The current "SmartContract" API teaches developers the
wrong paradigm. zkApps are not smart contracts. They are systems where logic
executes off-chain, correctness is proven cryptographically and the chain
verifies - nothing more. The SDK must make this lifecycle explicit: off-chain
execution → proof generation → submission → verification. o1js gets reworked to
teach the zkApp paradigm, not the Ethereum paradigm.

**Protocol-level blockers.** zkPromise, deletable accounts, fee authorization
via smart contracts - these are not nice-to-haves. They are the primitives that
make privacy-preserving applications possible. Without fee authorization through
proofs, users must expose a stable public address just to participate. That
breaks the privacy model entirely. These ship as priority.

**State management.** On-chain state access remains a significant blocker for
real-world zkApps. We accept targeted tradeoffs to make read/write state more
accessible and reduce the need for complex off-chain infrastructure. Pragmatism
over purity.

**Proving performance.** Proving is the primary user-visible bottleneck. Faster
native proving, mobile proving paths and integration with browser and native
runtimes. If a proof takes 30 seconds, the UX is dead. This is non-negotiable.

**Composability and advanced features.** Historic preconditions, access to
previous transactions, atomic multi-contract updates, full tree inspection -
these capabilities expand what's possible with zkApps and reduce the need for
off-chain workarounds. They go from "exploratory" to "on the roadmap."

**The goal:** A developer picks up o1js, builds a privacy-preserving application
and ships it to users - without fighting the protocol, without building custom
infrastructure, without needing to understand the full ZK stack. That's the bar.

---

## Where Privacy Gets Concrete

The vision is grand. The use cases are specific. Here's where Mina's
architecture wins - and where the PoCs and partnerships we're already exploring
slot in:

**Private Identity & Selective Disclosure** - Prove age without revealing
birthdate. Prove residency without revealing address. Prove uniqueness without a
global ID. eIDAS 2.0 wallets, verifiable credentials and privacy-preserving KYC

- this is the intersection of regulatory demand and Mina's core capability.

**Confidential Applications** - Private balances, sealed-bid auctions,
confidential voting, dark pools, privacy-enhanced trading. Applications that
_cannot exist_ on transparent chains. Mina makes them structurally possible.

**Privacy-Preserving Compliance** - Prove compliance without exposing records.
Share proofs selectively with auditors or regulators. This is the enterprise
unlock - institutional adoption without forced full transparency.

**Client-Side Verification & Metadata Minimization** - Wallets that verify
locally. Apps that don't leak intent to RPC providers. The browser node closes
the metadata gap that undermines every other privacy system. This is Mina's
unique architectural advantage and no one else can replicate it without
rebuilding from scratch.

**Cross-Chain Privacy Composability** - Applications verifying proven facts from
other chains - Zcash balances, Ethereum rollup states, off-chain credentials -
without re-proving and without exposing the underlying data. Privacy that works
_across_ ecosystems, not just within them.

These domains directly inform what we build, who we partner with and where
revenue comes from. More specific use cases and PoC integrations will be
detailed separately.

---

## Revenue: Proof of Relevance

Revenue is not a distraction from Mina's mission. It's the clearest signal that
the mission is working.

**Five pillars, all downstream of ecosystem success:**

1. **Network participation** - Staking, block production, protocol-level fees.
   Aligned by default, limited in near-term scale. The baseline.
2. **Infrastructure-as-a-Service** - Archive nodes, API nodes, managed
   infrastructure. Free tiers for experimentation, paid tiers with SLAs and
   guarantees. The most credible near-term revenue bridge - converts developer
   adoption directly into sustainable funding.
3. **Developer platform & tooling** - Hosted proving, advanced APIs, SDK
   licensing. Scales with developer adoption, reinforces Mina's positioning as a
   usable privacy platform.
4. **Services & enterprise** - Protocol integrations, security audits,
   permissioned deployments, custom features for regulated verticals. Enterprise
   work funds Mina's future without fragmenting it.
5. **Strategic funding** - Ecosystem grants, partnership-driven funding,
   treasury agreements. Extends runway while preserving focus.

Revenue introduces discipline and prioritization. It tells us what's working.
Every revenue path reinforces Mina's direction - none extract value at the
ecosystem's expense.

---

## What Success Looks Like

If we get this right over the next 5–10 years:

Users interact with applications without ever exposing identity or intent.
Proofs replace accounts and transactions as the unit of interaction. Wallets
feel like powerful local execution environments - not fragile key managers
tethered to centralized infrastructure. Zcash holders access DeFi, governance,
and programmable applications without leaving their privacy set. Proven facts
flow across chains seamlessly - verified once, trusted everywhere. Applications
verify claims, not user data. Developers build privacy-first applications in
TypeScript as naturally as they build web apps today.

Privacy becomes invisible. Not because it doesn't exist - but because it's woven
into every layer of the system.

zkApps stop feeling novel. They feel inevitable.

---

## How We Work: The Culture Reset

If there is a will, there is a way. For too long, we had the way but not the
will. Mina 2.0 starts with a decision: we are done being cautious, done being
paralyzed by our own complexity, done optimizing systems that never ship. The
will comes first. Everything else follows.

**o1labs leads. Publicly.** No more ambiguity about who's driving Mina. We own
the direction, the narrative, the execution and the accountability. The
ecosystem needs a leader. We are that leader.

**We ship, or it doesn't count.** The single biggest cultural shift: shipping
replaces planning as the primary unit of progress. Prototypes go out the door.
We test ideas in public. We kill what doesn't work fast and double down on what
does. A prototype that's live teaches us more than a design doc that's perfect.

**AI-native engineering.** We don't just use AI tools - we build our workflows
around them. Every engineer is expected to leverage coding agents, AI-assisted
development and modern tooling to multiply their output. We measure velocity,
not headcount. A small team moving at AI-augmented speed is our competitive edge
against organizations 5x our size.

**Focus replaces optionality.** Fewer parallel bets. Tighter coordination.
Everyone builds Mina - not isolated systems adjacent to it. Mina becomes our
target again.

**We execute faster than we ever have.** This is the single biggest lesson of
the last few years. The ideas were right. The architecture was right. The
execution was too slow - because we lacked capability, because we lacked
conviction and because we were paralyzed. That changes now. Mina 2.0 is defined
by velocity.

**Privacy claims get backed by product.** "Architecting the world's freedom
machine" is the north star. But every public claim gets backed by something you
can touch. No more narrative without product truth.

**Tradeoffs are explicit and documented.** We say what we're not doing and why.
Progressive decentralization - harden as adoption grows. This is strength, not
compromise.

---

The Decision Starts Now

We don't need another quarter of exploration. We need a decision - and then we
move.

In the coming four weeks, we reset. No legacy constraints, no "but we've always
done it this way". We architect Mina 2.0 from a clean slate - as if we were
building it today, with everything we know now.

Responsibilities and roles are redefined around this mission. Working groups
form with clear mandates: materialize the vision, evaluate technologies, make
architectural calls and design the protocol and organization that Mina and
o1labs need to become. Every group builds a recommendation with clear steps and
outcome, not a research paper.

Four weeks from now, we have a plan. Then we build.

---

## Closing

This is not the easiest path. It requires focus, hard tradeoffs, uncomfortable
honesty and sustained conviction.

But the ideas are right. The architecture is right. The market timing - for the
first time in years - is right. And for the first time, the tools exist to let a
small, focused team build at the speed this vision demands.

Mina's original promise was independent verification as a public good. zkApps
complete that promise. The browser node protects it. The verification layer
extends it across chains. Partnership validates it with real users and real
credibility. PoCs already in motion prove we're not waiting for permission. And
a committed, AI-augmented team ships it faster than anyone expects.

The only thing that's been missing is the will to go all-in and the tools to do
so. The way was always there. Now we bring the will.

Every conversation about Mina leads back to the same core ideas: verifiability,
succinctness, programmable privacy. These aren't features on a roadmap - they're
the reason this protocol exists. We don't need to reinvent the wheel. We already
did that. We only need to aim big and execute on it. But to succeed, we need to
convince ourselves first, and then convince others. People don't follow
uncertainty. They follow commitment and confidence.

What held us back was making promises we couldn't follow through on - not
because the ideas were wrong, but because the codebase wouldn't let us move fast
enough. That's no longer the case. The code was the blocker. With modern tools,
a unified stack, and the will to make hard calls, it isn't anymore.

It's tempting to pick one lane - just be the Zcash programmability layer or a
privacy app chain - and execute narrowly. But a small vision doesn't attract
talent, it doesn't inspire a community and doesn't survive the inevitable
setbacks. If we position Mina as "the smart contract layer for Zcash", we've
capped our ceiling at Zcash's adoption and coupled our fate to someone else's
roadmap. If Ztarknet ships first or Zcash governance implodes further, we're
left with nothing. The grand vision is the resilient one - Zcash programmability
lives inside it as a strategic move, not as the entire identity. We need a
vision large enough that any single partnership failing doesn't break the
thesis. More importantly, people don't rally behind modest ambitions. Engineers
don't leave comfortable jobs to build something small. Communities don't stay
loyal through hard times for an incremental improvement. The vision must be
worth the fight - or the fight won't happen.

This vision doesn't replace what came before - it encapsulates it. Every
previous direction, every idea that excited us, every promise we made to the
community - they all live inside this. What changes is how we work. We reset the
execution. We aim big, we get excited again, we build back trust through
delivery, and we become a leader in this industry - not an joke.

Let's be honest about where we are. Developers are leaving. Community members
are leaving. Node operators are leaving. The token price reflects all of it. The
status quo isn't neutral - it's actively declining. Every month without clear
direction, another builder moves on, another node operator shuts down, another
community member stops showing up. There is no "keep doing what we're doing"
option. That path leads to irrelevance. But here's the other side of that truth:
we're at the bottom. And from the bottom, the only direction is up - if we
commit. The people who are still here are the ones who believe in what Mina can
be. The ones who left? They left because of indecision, not because the
technology was wrong. Give them a reason to come back - a clear vision, visible
execution, and a team that's finally all-in - and they will. The worst thing we
can do right now is play it safe. Playing it safe is what got us here.

This vision is a starting point, not a finished plan. It sets the direction -
but we need every brain in the room to get the details right. The architecture,
the tradeoffs, the sequencing, the things we haven't thought of yet - that comes
from the team. No one person has all the answers. The best version of Mina 2.0
is the one we build together, argued over, pressure-tested, and owned
collectively. So push back. Poke holes. Bring your best ideas and your hardest
questions. That's how we make this real.

Let's finish the job Mina started.

Nietzsche famously wrote in The Gay Science:

> _"Amor fati: let that henceforth be my love."_

meaning to embrace, love and affirm everything that happens in life - both good
and bad - as necessary, constructive and unavoidable.
