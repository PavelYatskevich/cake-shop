class GetSecretValueCommand {
  constructor(input) {
    this.input = input;
  }
}

class SecretsManagerClient {
  send() {
    return Promise.resolve({ SecretString: "{}" });
  }
}

module.exports = {
  GetSecretValueCommand,
  SecretsManagerClient,
};
