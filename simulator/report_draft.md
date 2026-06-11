# AI-Driven Adaptive Testing in AILA: A Comparative Evaluation of Graph-Neighbor and Information-Based Question Selection Policies

**Author:** Ruhma Hashmi
**Course:** Independent Study
**Supervisor:** Dr. Yuan An
**Date:** June 2026

---

## 1. Introduction

Adaptive testing systems improve diagnostic efficiency by dynamically selecting questions
based on a learner's evolving performance, rather than administering a fixed sequence to
all students. AILA (An Intelligent Learning Assistant) provides an AI-driven learning
environment with an existing course knowledge graph and multiple-choice question bank,
creating a natural substrate for exploring concept-level adaptive diagnostic strategies.
Despite this infrastructure, the question of which selection policy best exploits the
knowledge graph structure for diagnostic purposes has not been empirically evaluated.

Question selection policy, which is the rule that determines which concept to probe next during
an adaptive session, is a fundamental design decision in any computerized adaptive
testing (CAT) system. Two broad classes of policy are relevant here: graph-constrained
policies, which restrict candidate questions to concepts neighboring the most recently
tested node in a knowledge graph, and information-based policies, which select globally
according to an uncertainty criterion without regard to graph structure. Whether the
additional constraint imposed by graph-based selection improves or degrades diagnostic
accuracy relative to unconstrained information-based selection is an open empirical
question in the context of concept-level mastery estimation.

This study addresses that question through a controlled simulation experiment. We
implement both policy types within a DINA-style probabilistic simulator operating over
a six-concept knowledge graph with four questions per concept. Three hundred simulated
students spanning three knowledge profiles — strong, medium, and weak — are evaluated
under each policy across three independent random seeds, yielding 900 student runs per
policy. Diagnostic accuracy, defined as the proportion of concepts correctly classified
at the end of each run, serves as the primary evaluation metric. Per-concept question
coverage and accuracy stability across seeds serve as secondary structural metrics.

This study asks: does question selection policy — graph-neighbor versus
information-based — produce a measurable difference in diagnostic accuracy in a
DINA-style adaptive simulator, and does any observed difference depend on student
knowledge level? The study is conducted entirely within a controlled simulation
environment; findings should be interpreted as characterizing policy behavior under
the specified model assumptions rather than as predictions of real classroom outcomes.

---

## 2. Related Work

### 2.1 Computerized Adaptive Testing and Item Response Theory

Computerized adaptive testing (CAT) improves the efficiency of educational assessment
by selecting items dynamically based on a continuously updated estimate of the
examinee's latent ability (Weiss, 1982; van der Linden & Glas, 2000). Rather than
administering a fixed item bank to all students, CAT systems apply a selection criterion
— most commonly maximum Fisher information or maximum likelihood estimation — to
identify the next item that is most informative given the current ability estimate.
This approach has been shown to reduce test length by 50% or more while maintaining
measurement precision comparable to full-length fixed-form tests (Wainer, 1990).

Standard CAT operates over a unidimensional ability scale and is not directly applicable
to settings where the diagnostic target is a multivariate mastery profile across discrete
concepts. The information-based selection policy implemented in this study is directly
inspired by CAT's uncertainty-reduction criterion, adapted to operate over a vector of
binary concept mastery estimates rather than a single continuous ability score.

### 2.2 Cognitive Diagnosis Models and the DINA Framework

Cognitive diagnosis models (CDMs) extend psychometric assessment from ability
estimation to the classification of fine-grained knowledge components (Rupp et al.,
2010). Unlike IRT, which estimates a single latent trait, CDMs model the joint mastery
state of multiple skills or concepts, producing a diagnostic profile that indicates which
competencies a student has and has not acquired. The Deterministic Input, Noisy AND-gate
model (DINA; Haertel, 1989; Junker & Sijtsma, 2001) is among the most widely studied
CDMs, representing each student as a binary mastery vector and modeling item responses
as a function of full mastery with stochastic slip and guess parameters.

The simulator in this study adopts DINA's binary mastery representation and
slip-guess response structure as a tractable ground-truth model against which diagnostic
accuracy can be measured exactly. This choice prioritizes experimental control — a known
true mastery state enables unambiguous accuracy measurement — over ecological validity,
a trade-off discussed further in the limitations section.

### 2.3 Knowledge Graphs in Adaptive Learning

Knowledge graphs encode prerequisite and associative relationships between learning
concepts, providing structural information that a purely item-level selection policy
does not exploit (Hsieh et al., 2019; Nakagawa et al., 2019). In knowledge-graph-based
adaptive learning systems, the graph constrains or guides item selection so that the
assessment path respects conceptual dependencies — for example, probing a prerequisite
concept before an advanced one, or clustering related concepts together within a
diagnostic session. AILA's course knowledge graph is a naturally available source of
this structural information.

The graph-neighbor selection policy evaluated in this study operationalizes this
principle directly: at each step, candidate questions are restricted to concepts that
are direct neighbors of the most recently tested concept in the knowledge graph. This
design tests whether graph-imposed locality produces a diagnostic benefit relative
to globally unconstrained information-based selection, which is the central empirical
question of this work.

---

## 3. Simulator Design

This section describes the components of the adaptive diagnostic simulator used in
this study. The simulator consists of five interdependent components: a knowledge
graph, a question bank, a student model, a mastery estimation module, and an adaptive
loop. All five components are shared identically across both experimental conditions.
The only element that varies between conditions is the question selection policy,
which is described in Section 4.

### 3.1 Knowledge Graph

The knowledge graph consists of six concept nodes with directed neighbor relationships
encoding associative proximity within the subject domain. Each concept node stores a
unique identifier and a list of direct neighbor concept IDs. The graph is not strictly
hierarchical — it includes cross-links between non-adjacent concepts — and is designed
to reflect a branching AILA-style topology rather than a simple linear sequence. The
neighbor relationships stored in the graph are the only structural information available
to the Graph Neighbor policy; the Information-Based policy does not access the graph
during selection.

### 3.2 Question Bank

The question bank contains 24 questions, four per concept. Each question is
parameterized by three values: a target concept ID, a slip parameter s = 0.10, and a
guess parameter g = 0.20. Slip and guess are held constant across all questions and
all students in this study. The question bank is fixed across all simulation runs;
no question is excluded or weighted differently between the two policy conditions.

### 3.3 Student Model

Each simulated student is characterized by a profile type and a true mastery vector.
The true mastery vector θ ∈ {0, 1}^6 encodes binary mastery status for each of the
six concepts, where θ_k = 1 indicates mastery of concept k and θ_k = 0 indicates
non-mastery. The true mastery vector is never directly observable by the adaptive
system — it is used only to simulate student responses and to evaluate diagnostic
accuracy at the end of each run.

Three student profile types are defined, differing in the probability that any given
concept is mastered at the time of student generation:

| Profile | Mastery probability per concept | Students per seed |
|---------|--------------------------------|-------------------|
| Strong  | p = 0.75                       | 100               |
| Medium  | p = 0.50                       | 100               |
| Weak    | p = 0.25                       | 100               |

Concept mastery values are sampled independently for each concept within each student.
A total of 300 students are generated per seed, giving 900 students per policy across
the three seeds used in this study.

### 3.4 Response Model

Student responses are generated using a DINA-style probabilistic response function.
Given a question targeting concept k, the probability of a correct response is:

P(correct | θ_k) = (1 - s) · θ_k + g · (1 - θ_k)

where s = 0.10 is the slip parameter and g = 0.20 is the guess parameter. This
formulation produces a correct response probability of 0.90 for mastered concepts
and 0.20 for non-mastered concepts, introducing realistic noise in both directions
without making the response model deterministic. Actual responses are sampled
as Bernoulli draws from this probability at runtime.

### 3.5 Mastery Estimation

The adaptive system maintains an estimated mastery vector m ∈ [0, 1]^6, initialized
at m_k = 0.5 for all k at the start of each student run. This initialization represents
maximum uncertainty and does not incorporate any prior knowledge of the student's
history. After each question-response step, the estimate for the tested concept is
updated according to a fixed-step rule:

m_k ← m_k + α     if the response is correct
m_k ← m_k - α     if the response is incorrect

where α = 0.1 is the update step size, held constant across all runs. The estimate
is clipped to [0, 1] after each update. Estimates for all other concepts remain
unchanged. The update rule is identical under both policy conditions.

A concept is classified as mastered in the final diagnosis if m_k ≥ 0.5 at the end
of the run, and as non-mastered otherwise. Diagnostic accuracy is then computed as
the proportion of the six concepts for which this classification matches the student's
true mastery state θ_k.

### 3.6 Stopping Rule

Each student run terminates when one of two conditions is met: the maximum question
limit of 12 is reached, or all concept estimates have remained stable — defined as
|Δm_k| < ε across consecutive steps for all k — for a specified number of consecutive
steps. In the current evaluation, the 12-question hard limit is the binding constraint
for all student runs; no student converges early under either policy. This means the
two policies are compared under exactly equal question budgets, and any accuracy
difference reflects selection quality rather than question count.

---

## 4. Algorithms

This section formally describes the adaptive loop and the two question selection
policies evaluated in this study. The adaptive loop structure and all components
outside the selection step are identical across both policy conditions.

### 4.1 Adaptive Loop

The adaptive loop iterates over question-response cycles until the stopping criterion
is met. At each step, a question is selected by the active policy, the student's
response is simulated, the mastery estimate is updated, and the step is logged.
The loop is formalized as follows:

ADAPTIVE_LOOP(student, policy, graph, question_bank, config):

Initialize m_k = 0.5 for all k ∈ {1, ..., 6}
Initialize step_count = 0
Initialize log = ]

WHILE step_count < MAX_QUESTIONS:

q ← SELECT_QUESTION(policy, graph, question_bank, m, last_concept)
r ← SIMULATE_RESPONSE(student.true_mastery, q)
m ← UPDATE_ESTIMATE(m, q.concept_id, r, α)
log.APPEND(step, q, r, m_before, m_after)
step_count ← step_count + 1

IF CONVERGED(m, threshold, consecutive_steps):
BREAK

RETURN log, m, step_count, stop_reason


The SELECT_QUESTION call is the only step that differs between the two policy
conditions. All other operations — response simulation, mastery update, logging,
and convergence checking — are executed identically regardless of which policy
is active.

### 4.2 Graph Neighbor Policy

The Graph Neighbor policy restricts candidate question selection to concepts that
are direct neighbors of the most recently tested concept in the knowledge graph.
Among those neighbors, the concept with the highest uncertainty score is selected,
and a question targeting that concept is drawn from the question bank.

SELECT_QUESTION_GN(graph, question_bank, m, last_concept):

neighbors ← graph.GET_NEIGHBORS(last_concept)
candidates ← questions in question_bank WHERE concept_id IN neighbors
AND question not yet asked

IF candidates is empty:
candidates ← ALL remaining unasked questions // global fallback

FOR each candidate q in candidates:
score(q) ← m[q.concept_id] × (1 - m[q.concept_id])

RETURN candidate q* with highest score(q*)


The uncertainty score m_k(1 - m_k) is maximized at m_k = 0.5 and approaches
zero as the estimate converges toward 0 or 1. The global fallback activates when
all neighbor-concept questions have been exhausted, preventing the policy from
stalling. The fallback reverts to global information-based selection for the
remainder of that student's run.

### 4.3 Information-Based Policy

The Information-Based policy selects globally from all remaining unasked questions,
without regard to graph structure. At each step it identifies the concept with the
highest uncertainty across the entire question bank and selects a question targeting
that concept.


SELECT_QUESTION_IB(question_bank, m):

candidates ← ALL remaining unasked questions

FOR each candidate q in candidates:
score(q) ← m[q.concept_id] × (1 - m[q.concept_id])

RETURN candidate q* with highest score(q*)


The Information-Based policy is equivalent to maximum-entropy item selection in
standard CAT, adapted to operate over concept-level mastery estimates rather than
a unidimensional ability parameter. It does not use the knowledge graph at any
point during selection.

### 4.4 Comparability of the Two Policies

The two policies share the same uncertainty scoring function, the same question
bank, and the same mastery estimation procedure. The sole structural difference is
that Graph Neighbor constrains the candidate pool to graph neighbors before scoring,
while Information-Based scores the full candidate pool without constraint. This
design ensures that any observed difference in diagnostic accuracy between the two
conditions is attributable to the selection constraint rather than to differences
in scoring, estimation, or stopping behavior.

---