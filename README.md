# Mooi Nederlands Test

This is a project intended for online school that teaches dutch: http://mooinederlands.ru.

This is an online test that helps to determine the language level of the users. Due to lack of data for questions, it is not production ready. However you can take a look at the demo at http://test-mooinederlands.ru.

Backend is written in python + flask + mysql, frontend is made with react and typescript.

### Test logic

The logic of the test is the following:

1. User starts the test at the chosen level (if the click `Don't know`, they start with the lowest level).
2. Each level consists of a certain number of questions. If a user passes a level (correctly answers a certain percentage of the questions), they go one level up. If the fail a level, they go one level down.

The test finishes if:

- The user has failed the lowest level (means that they don't know the language at all).
- The user has passed the highest level (means that they know the language better than what the test is capable of testing).
- The user has passed level X, went one level up and then failed level X+1. It means their language level is X.
- The user has failed level X, went one level down and then passed level X-1. It means their language level is X-1.
