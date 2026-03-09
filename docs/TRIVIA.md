# TRIVIA.md — Club History Questions

All trivia data lives in `src/data/trivia.json`. Add questions here and in the JSON simultaneously.

## Format
```json
{
  "id": "unique_id",
  "question_en": "English question text?",
  "question_fi": "Finnish question text?",
  "answer": "The answer",
  "category": "history | players | moments | inside_jokes"
}
```

## Effect
- Correct answer: your first card in the match automatically wins
- Wrong answer: opponent picks one player on your team to receive -1 all stats

## Questions Needed
The crew needs to supply club history questions. Categories:
- Club founding story
- Famous goals and moments
- Season results
- Player milestones
- Inside jokes and nicknames
