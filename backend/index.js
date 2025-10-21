const cdk = require('aws-cdk-lib');

class BackendStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);
    // Your infrastructure code will go here
  }
}

const app = new cdk.App();
new BackendStack(app, 'BarkbaseBackendStack');
