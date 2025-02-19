import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cdk from 'aws-cdk-lib';
import * as actions from 'aws-cdk-lib/aws-ses-actions';

/**********************************************************************************************************************
 *
 *    Warning! This test case can not be deployed!
 *
 *    Save yourself some time and move on.
 *    The latest given reason is:
 *    - 2023-08-30: Uses a hardcoded email address that is not verified, @mrgrain
 *
 *********************************************************************************************************************/

const app = new cdk.App();

const stack = new cdk.Stack(app, 'aws-cdk-ses-receipt');

const topic = new sns.Topic(stack, 'Topic');

const fn = new lambda.Function(stack, 'Function', {
  code: lambda.Code.fromInline('exports.handler = async (event) => event;'),
  handler: 'index.handler',
  runtime: lambda.Runtime.NODEJS_16_X,
});

const bucket = new s3.Bucket(stack, 'Bucket');

const kmsKey = new kms.Key(stack, 'Key');

const ruleSet = new ses.ReceiptRuleSet(stack, 'RuleSet', {
  dropSpam: true,
});

const firstRule = ruleSet.addRule('FirstRule', {
  actions: [
    new actions.AddHeader({
      name: 'X-My-Header',
      value: 'value',
    }),
    new actions.Lambda({
      function: fn,
      invocationType: actions.LambdaInvocationType.REQUEST_RESPONSE,
      topic,
    }),
    new actions.S3({
      bucket,
      kmsKey,
      objectKeyPrefix: 'emails/',
      topic,
    }),
    new actions.Sns({
      encoding: actions.EmailEncoding.BASE64,
      topic,
    }),
  ],
  receiptRuleName: 'FirstRule',
  recipients: ['cdk-ses-receipt-test@yopmail.com'],
  scanEnabled: true,
  tlsPolicy: ses.TlsPolicy.REQUIRE,
});

firstRule.addAction(new actions.Bounce({
  sender: 'cdk-ses-receipt-test@yopmail.com',
  template: actions.BounceTemplate.MESSAGE_CONTENT_REJECTED,
  topic,
}));

const secondRule = ruleSet.addRule('SecondRule');

secondRule.addAction(new actions.Stop({
  topic,
}));

app.synth();
