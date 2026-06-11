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