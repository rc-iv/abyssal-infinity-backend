# Abyssal Infinity Backend

This is the backend for the Abyssal Infinity, a 2D dungeon crawler game. This backend is responsible for generating an infinite series of dungeons, monsters, loot, NPCs, and their image sprites using prompts to GPT-4 and DALL-E 2 respectively.

## Prerequisites

- AWS account with `AWS_ACCESS_KEY_ID` and `AWS_SECRET_KEY`.
- OpenAI API account with `OPENAI_API_KEY`.
- AWS SAM CLI installed for deployment.

## Environment Variables

Copy the .env.sample file to a .env file in the root directory, then replace the placeholders with your credentials.

```
OPENAI_API_KEY=
BUCKET_NAME=
AWS_ACCESS_KEY_ID=
AWS_SECRET_KEY=
```


## Installation

1. Install Node.js dependencies:

```npm install```


## Deployment

This backend is deployed using AWS SAM CLI and involves two main build flows:

1. Deploying the AWS Lambda functions:
 ```
 sam build
 sam deploy --guided
 ```

2. Running the script to generate new levels and add them to DynamoDB:
 ```
 node generate_levels.js
 ```

## Lambda Functions

Several Lambda functions are included in the `template.yaml` configuration file. Here's a brief rundown:

- `ConnectLambdaFunction`: Handles connections.
- `DisconnectLambdaFunction`: Handles disconnections.
- `DefaultLambdaFunction`: Default function.
- `NewGameLambdaFunction`: Creates a new game.
- `MoveLambdaFunction`: Moves the player.
- `NextLevelLambdaFunction`: Transfers the player to the next level.
- `AttackLambdaFunction`: Player performs an attack.
- `EquipItemLambdaFunction`: Player equips an item.
- `PackItemLambdaFunction`: Player packs an item.
- `BuyLambdaFunction`: Player makes a purchase.
- `SellLambdaFunction`: Player sells an item.
- `HealLambdaFunction`: Player heals.

Each function resides in its own directory under the `lambda/` directory and contains its own `package.json` file with its respective dependencies.


Please note that each Lambda function should have its own tests, and should be run within their respective directories.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License - see the LICENSE.md file for details.
