# ExamGuru Quest MCQ competency tagging standard

## Required taxonomy

Every MCQ must have exactly one cognitive-demand tag:

- \`knowledge-understanding\`: recall, recognise, identify, define, explain a stated idea or show understanding of a fact, term, rule or concept.
- \`application\`: use a concept, rule, method, formula or procedure in a familiar or new situation; solve a contextual or numerical problem; apply grammar or a language convention.
- \`analysis-evaluation-creation\`: compare, interpret, infer, identify relationships or patterns, assess evidence or arguments, justify a conclusion, evaluate a method or select the best-supported explanation.

Competency is **not** difficulty. Easy, Medium and Hard are independent fields. A difficult recall question remains Knowledge & Understanding; a simple data inference can be Analysis.

## Required metadata

Newly authored MCQs must include:

\`\`\`json
{
  "competency": "application",
  "competencyTagStatus": "author-confirmed",
  "competencyTagReason": "The learner must apply the ratio method to the values in the question.",
  "competencyTaggerVersion": "1.0.0"
}
\`\`\`

Use one of the three exact competency values above. Do not omit the fields, invent a fourth category, or use difficulty as a substitute. The rationale should describe the thinking action the learner must perform, not repeat the chapter name.

## Selection guide across subjects

- Mathematics: routine recall of a property or formula is Knowledge & Understanding; computing, solving or applying a method to given values is Application; multi-condition patterns, proof-like reasoning, or comparing possible strategies is Analysis.
- Science: naming a law, organ or process is Knowledge & Understanding; applying a principle to an experiment, circuit, numerical or real situation is Application; interpreting observations/data, evaluating an explanation, or drawing a supported inference is Analysis.
- Social Science: direct fact, term, location or chronology is Knowledge & Understanding; applying a civics, geography or economic concept to a situation is Application; interpreting a source/map/data, comparing causes or weighing evidence is Analysis.
- English and Hindi: vocabulary, direct author/fact recall and basic rules are Knowledge & Understanding; choosing or using a grammar/language rule in a sentence is Application; interpreting an unseen passage, analysing tone/theme/character, inferring meaning or evaluating a claim is Analysis.
- SOF: section names such as Logical Reasoning, Mathematical Reasoning and Achievers are useful evidence for Analysis, but still check the actual task. A subject-section question is not automatically Knowledge.

## Legacy-bank migration

The shared deterministic tagger adds a provisional competency to every supported legacy MCQ during the Pages build. Its status is \`inferred\` when a rule matched and \`needs-review\` when the question did not expose a reliable cognitive-demand cue. Provisional labels must not be represented as educator-verified. Admin Question Bank Editor displays the current status; saving a competency choice records \`author-confirmed\`.

The tagger does not rewrite question text, answer options, correct answers, explanations or difficulty. It never changes a question to another competency based solely on Easy/Medium/Hard. Any question marked \`needs-review\` should be checked before it is used for competency-sensitive adaptive or Olympiad selection.

## Quality gates

Build and CI must verify that:
1. all supported class/subject/SOF MCQs have the required fields and an allowed value;
2. every new or edited Admin MCQ has an author-confirmed choice;
3. legacy low-confidence labels remain visibly marked for review;
4. competency counts and review counts are reported independently of difficulty counts.
