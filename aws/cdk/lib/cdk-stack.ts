import * as cdk from "aws-cdk-lib";
import * as apigw from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration, WebSocketLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import * as path from "path";

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Import existing VPC (default VPC)
    const vpc = ec2.Vpc.fromLookup(this, "VPC", {
      isDefault: true,
    });

    // Import existing security group for Lambda
    const lambdaSG = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      "LambdaSG",
      "sg-0caa2970bb152647e"
    );

    // Shared environment variables
    const dbEnvironment = {
      DB_HOST: process.env.DB_HOST || "",
      DB_PORT: process.env.DB_PORT || "5432",
      DB_NAME: process.env.DB_NAME || "myapp",
      DB_USER: process.env.DB_USER || "postgres",
      DB_PASSWORD: process.env.DB_PASSWORD || "",
    };

    // Database Layer
    const dbLayer = new lambda.LayerVersion(this, "DbLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/db-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Provides a shared database connection pool",
    });

    // Users API
    const usersApiFunction = new lambda.Function(this, "UsersApiFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../lambdas/users-api")
      ),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true, // ADD THIS LINE
    });

    // HTTP API Gateway
    const httpApi = new apigw.HttpApi(this, "BarkbaseApi", {
      corsPreflight: {
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
          "x-tenant-id",
        ],
        allowMethods: [
          apigw.CorsHttpMethod.OPTIONS,
          apigw.CorsHttpMethod.GET,
          apigw.CorsHttpMethod.POST,
          apigw.CorsHttpMethod.PUT,
          apigw.CorsHttpMethod.DELETE,
        ],
        allowOrigins: ["*"],
      },
    });

    // Users Routes
    const usersIntegration = new HttpLambdaIntegration(
      "UsersIntegration",
      usersApiFunction
    );
    httpApi.addRoutes({
      path: "/api/v1/users",
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST],
      integration: usersIntegration,
    });
    httpApi.addRoutes({
      path: "/api/v1/users/{id}",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: usersIntegration,
    });

    // Pets API
    const petsApiFunction = new lambda.Function(this, "PetsApiFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../lambdas/pets-api")
      ),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const petsIntegration = new HttpLambdaIntegration(
      "PetsIntegration",
      petsApiFunction
    );
    httpApi.addRoutes({
      path: "/api/v1/pets",
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST],
      integration: petsIntegration,
    });
    httpApi.addRoutes({
      path: "/api/v1/pets/{id}",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: petsIntegration,
    });

    // S3 Bucket
    const bucketName = process.env.S3_BUCKET || "your-bucket-name-goes-here";
    const bucket = s3.Bucket.fromBucketName(
      this,
      "ExistingS3Bucket",
      bucketName
    );

    // S3 environment
    const s3Environment = {
      S3_BUCKET: process.env.S3_BUCKET || "",
      CLOUDFRONT_DOMAIN: process.env.CLOUDFRONT_DOMAIN || "",
    };

    // Upload URL Function
    const getUploadUrlFunction = new lambda.Function(
      this,
      "GetUploadUrlFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../lambdas/get-upload-url")
        ),
        environment: s3Environment,
        timeout: cdk.Duration.seconds(30),
      }
    );
    bucket.grantWrite(getUploadUrlFunction);

    const getUploadUrlIntegration = new HttpLambdaIntegration(
      "GetUploadUrlIntegration",
      getUploadUrlFunction
    );
    httpApi.addRoutes({
      path: "/api/v1/upload-url",
      methods: [apigw.HttpMethod.POST],
      integration: getUploadUrlIntegration,
    });

    // --- S3 Download URL Generator ---
    const getDownloadUrlFunction = new lambda.Function(this, 'GetDownloadUrlFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/get-download-url')),
      environment: s3Environment,
    });
    bucket.grantRead(getDownloadUrlFunction);
    const getDownloadUrlIntegration = new HttpLambdaIntegration('GetDownloadUrlIntegration', getDownloadUrlFunction);
    httpApi.addRoutes({
      path: '/api/v1/download-url',
      methods: [apigw.HttpMethod.GET],
      integration: getDownloadUrlIntegration,
    });

    // Note: Check-in/Check-out are handled by bookings-api Lambda

    // Add JWT_SECRET to environment for auth
    const authEnvironment = { ...dbEnvironment, JWT_SECRET: process.env.JWT_SECRET || 'change-me-in-production' };

    // === NEW LAMBDA FUNCTIONS ===

    // Auth API
    const authApiFunction = new lambda.Function(this, 'AuthApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/auth-api')),
      layers: [dbLayer],
      environment: authEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const authIntegration = new HttpLambdaIntegration('AuthIntegration', authApiFunction);
    httpApi.addRoutes({ path: '/api/v1/auth/login', methods: [apigw.HttpMethod.POST], integration: authIntegration });
    httpApi.addRoutes({ path: '/api/v1/auth/signup', methods: [apigw.HttpMethod.POST], integration: authIntegration });
    httpApi.addRoutes({ path: '/api/v1/auth/refresh', methods: [apigw.HttpMethod.POST], integration: authIntegration });
    httpApi.addRoutes({ path: '/api/v1/auth/logout', methods: [apigw.HttpMethod.POST], integration: authIntegration });
    httpApi.addRoutes({ path: '/api/v1/auth/register', methods: [apigw.HttpMethod.POST], integration: authIntegration });

    // Bookings API
    const bookingsApiFunction = new lambda.Function(this, 'BookingsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/bookings-api')),
      layers: [dbLayer],
      environment: authEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const bookingsIntegration = new HttpLambdaIntegration('BookingsIntegration', bookingsApiFunction);
    httpApi.addRoutes({ path: '/api/v1/bookings', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: bookingsIntegration });
    httpApi.addRoutes({ path: '/api/v1/bookings/{bookingId}', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PUT, apigw.HttpMethod.DELETE], integration: bookingsIntegration });
    httpApi.addRoutes({ path: '/api/v1/bookings/{bookingId}/status', methods: [apigw.HttpMethod.PATCH], integration: bookingsIntegration });
    httpApi.addRoutes({ path: '/api/v1/bookings/{bookingId}/checkin', methods: [apigw.HttpMethod.POST], integration: bookingsIntegration });
    httpApi.addRoutes({ path: '/api/v1/bookings/{bookingId}/checkout', methods: [apigw.HttpMethod.POST], integration: bookingsIntegration });

    // Tenants API
    const tenantsApiFunction = new lambda.Function(this, 'TenantsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/tenants-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const tenantsIntegration = new HttpLambdaIntegration('TenantsIntegration', tenantsApiFunction);
    httpApi.addRoutes({ path: '/api/v1/tenants', methods: [apigw.HttpMethod.GET], integration: tenantsIntegration });
    httpApi.addRoutes({ path: '/api/v1/tenants/current', methods: [apigw.HttpMethod.GET], integration: tenantsIntegration });
    httpApi.addRoutes({ path: '/api/v1/tenants/current/plan', methods: [apigw.HttpMethod.GET], integration: tenantsIntegration });
    httpApi.addRoutes({ path: '/api/v1/tenants/current/onboarding', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PATCH], integration: tenantsIntegration });
    httpApi.addRoutes({ path: '/api/v1/tenants/theme', methods: [apigw.HttpMethod.PUT], integration: tenantsIntegration });
    httpApi.addRoutes({ path: '/api/v1/tenants/current/theme', methods: [apigw.HttpMethod.PUT], integration: tenantsIntegration });
    httpApi.addRoutes({ path: '/api/v1/tenants/features', methods: [apigw.HttpMethod.PUT], integration: tenantsIntegration });

    // Owners API
    const ownersApiFunction = new lambda.Function(this, 'OwnersApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/owners-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const ownersIntegration = new HttpLambdaIntegration('OwnersIntegration', ownersApiFunction);
    httpApi.addRoutes({ path: '/api/v1/owners', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: ownersIntegration });
    httpApi.addRoutes({ path: '/api/v1/owners/{ownerId}', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PUT, apigw.HttpMethod.DELETE], integration: ownersIntegration });

    // Payments API
    const paymentsApiFunction = new lambda.Function(this, 'PaymentsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/payments-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const paymentsIntegration = new HttpLambdaIntegration('PaymentsIntegration', paymentsApiFunction);
    httpApi.addRoutes({ path: '/api/v1/payments', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: paymentsIntegration });
    httpApi.addRoutes({ path: '/api/v1/payments/{paymentId}', methods: [apigw.HttpMethod.GET], integration: paymentsIntegration });

    // Reports API
    const reportsApiFunction = new lambda.Function(this, 'ReportsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/reports-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const reportsIntegration = new HttpLambdaIntegration('ReportsIntegration', reportsApiFunction);
    httpApi.addRoutes({ path: '/api/v1/reports/dashboard', methods: [apigw.HttpMethod.GET], integration: reportsIntegration });
    httpApi.addRoutes({ path: '/api/v1/reports/revenue', methods: [apigw.HttpMethod.GET], integration: reportsIntegration });
    httpApi.addRoutes({ path: '/api/v1/reports/occupancy', methods: [apigw.HttpMethod.GET], integration: reportsIntegration });

    // Kennels API
    const kennelsApiFunction = new lambda.Function(this, 'KennelsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/kennels-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const kennelsIntegration = new HttpLambdaIntegration('KennelsIntegration', kennelsApiFunction);
    httpApi.addRoutes({ path: '/api/v1/kennels', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: kennelsIntegration });
    httpApi.addRoutes({ path: '/api/v1/kennels/{kennelId}', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PUT, apigw.HttpMethod.DELETE], integration: kennelsIntegration });

    // Staff API
    const staffApiFunction = new lambda.Function(this, 'StaffApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/staff-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const staffIntegration = new HttpLambdaIntegration('StaffIntegration', staffApiFunction);
    httpApi.addRoutes({ path: '/api/v1/staff', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: staffIntegration });
    httpApi.addRoutes({ path: '/api/v1/staff/{staffId}', methods: [apigw.HttpMethod.GET], integration: staffIntegration });

    // Dashboard API
    const dashboardApiFunction = new lambda.Function(this, 'DashboardApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/dashboard-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const dashboardIntegration = new HttpLambdaIntegration('DashboardIntegration', dashboardApiFunction);
    httpApi.addRoutes({ path: '/api/v1/dashboard/overview', methods: [apigw.HttpMethod.GET], integration: dashboardIntegration });

    // Calendar API
    const calendarApiFunction = new lambda.Function(this, 'CalendarApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/calendar-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const calendarIntegration = new HttpLambdaIntegration('CalendarIntegration', calendarApiFunction);
    httpApi.addRoutes({ path: '/api/v1/calendar', methods: [apigw.HttpMethod.GET], integration: calendarIntegration });

    // Incidents API
    const incidentsApiFunction = new lambda.Function(this, 'IncidentsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/incidents-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const incidentsIntegration = new HttpLambdaIntegration('IncidentsIntegration', incidentsApiFunction);
    httpApi.addRoutes({ path: '/api/v1/incidents', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: incidentsIntegration });

    // Services API
    const servicesApiFunction = new lambda.Function(this, 'ServicesApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/services-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const servicesIntegration = new HttpLambdaIntegration('ServicesIntegration', servicesApiFunction);
    httpApi.addRoutes({ path: '/api/v1/services', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: servicesIntegration });
    httpApi.addRoutes({ path: '/api/v1/services/{serviceId}', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PUT, apigw.HttpMethod.DELETE], integration: servicesIntegration });

    // Invites API
    const invitesApiFunction = new lambda.Function(this, 'InvitesApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/invites-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const invitesIntegration = new HttpLambdaIntegration('InvitesIntegration', invitesApiFunction);
    httpApi.addRoutes({ path: '/api/v1/invites', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: invitesIntegration });

    // Invoices API
    const invoicesApiFunction = new lambda.Function(this, 'InvoicesApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/invoices-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const invoicesIntegration = new HttpLambdaIntegration('InvoicesIntegration', invoicesApiFunction);
    httpApi.addRoutes({ path: '/api/v1/invoices', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: invoicesIntegration });

    // Packages API
    const packagesApiFunction = new lambda.Function(this, 'PackagesApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/packages-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const packagesIntegration = new HttpLambdaIntegration('PackagesIntegration', packagesApiFunction);
    httpApi.addRoutes({ path: '/api/v1/packages', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: packagesIntegration });

    // Tasks API
    const tasksApiFunction = new lambda.Function(this, 'TasksApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/tasks-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const tasksIntegration = new HttpLambdaIntegration('TasksIntegration', tasksApiFunction);
    httpApi.addRoutes({ path: '/api/v1/tasks', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: tasksIntegration });
    httpApi.addRoutes({ path: '/api/v1/tasks/{taskId}', methods: [apigw.HttpMethod.PATCH], integration: tasksIntegration });

    // Messages API
    const messagesApiFunction = new lambda.Function(this, 'MessagesApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/messages-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const messagesIntegration = new HttpLambdaIntegration('MessagesIntegration', messagesApiFunction);
    httpApi.addRoutes({ path: '/api/v1/messages', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: messagesIntegration });

    // Runs API
    const runsApiFunction = new lambda.Function(this, 'RunsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/runs-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const runsIntegration = new HttpLambdaIntegration('RunsIntegration', runsApiFunction);
    httpApi.addRoutes({ path: '/api/v1/runs', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: runsIntegration });
    httpApi.addRoutes({ path: '/api/v1/runs/{runId}', methods: [apigw.HttpMethod.PUT], integration: runsIntegration });

    // Memberships API
    const membershipsApiFunction = new lambda.Function(this, 'MembershipsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/memberships-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const membershipsIntegration = new HttpLambdaIntegration('MembershipsIntegration', membershipsApiFunction);
    httpApi.addRoutes({ path: '/api/v1/memberships', methods: [apigw.HttpMethod.GET], integration: membershipsIntegration });
    httpApi.addRoutes({ path: '/api/v1/memberships/{membershipId}', methods: [apigw.HttpMethod.PUT], integration: membershipsIntegration });

    // Admin API
    const adminApiFunction = new lambda.Function(this, 'AdminApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/admin-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const adminIntegration = new HttpLambdaIntegration('AdminIntegration', adminApiFunction);
    httpApi.addRoutes({ path: '/api/v1/admin/stats', methods: [apigw.HttpMethod.GET], integration: adminIntegration });

    // Billing API
    const billingApiFunction = new lambda.Function(this, 'BillingApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/billing-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const billingIntegration = new HttpLambdaIntegration('BillingIntegration', billingApiFunction);
    httpApi.addRoutes({ path: '/api/v1/billing/metrics', methods: [apigw.HttpMethod.GET], integration: billingIntegration });

    // Communication API
    const communicationApiFunction = new lambda.Function(this, 'CommunicationApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/communication-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const communicationIntegration = new HttpLambdaIntegration('CommunicationIntegration', communicationApiFunction);
    httpApi.addRoutes({ path: '/api/v1/communications', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: communicationIntegration });

    // Notes API
    const notesApiFunction = new lambda.Function(this, 'NotesApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/notes-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const notesIntegration = new HttpLambdaIntegration('NotesIntegration', notesApiFunction);
    httpApi.addRoutes({ path: '/api/v1/notes', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: notesIntegration });

    // Roles API
    const rolesApiFunction = new lambda.Function(this, 'RolesApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/roles-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const rolesIntegration = new HttpLambdaIntegration('RolesIntegration', rolesApiFunction);
    httpApi.addRoutes({ path: '/api/v1/roles', methods: [apigw.HttpMethod.GET], integration: rolesIntegration });

    // Facility API
    const facilityApiFunction = new lambda.Function(this, 'FacilityApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/facility-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const facilityIntegration = new HttpLambdaIntegration('FacilityIntegration', facilityApiFunction);
    httpApi.addRoutes({ path: '/api/v1/facility', methods: [apigw.HttpMethod.GET], integration: facilityIntegration });

    // Account Defaults API
    const accountDefaultsApiFunction = new lambda.Function(this, 'AccountDefaultsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/account-defaults-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const accountDefaultsIntegration = new HttpLambdaIntegration('AccountDefaultsIntegration', accountDefaultsApiFunction);
    httpApi.addRoutes({ path: '/api/v1/account-defaults', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PUT], integration: accountDefaultsIntegration });

    // User Permissions API
    const userPermissionsApiFunction = new lambda.Function(this, 'UserPermissionsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/user-permissions-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const userPermissionsIntegration = new HttpLambdaIntegration('UserPermissionsIntegration', userPermissionsApiFunction);
    httpApi.addRoutes({ path: '/api/v1/user-permissions', methods: [apigw.HttpMethod.GET], integration: userPermissionsIntegration });

    // === WEBSOCKET API FOR REAL-TIME ===

    // WebSocket Connect Handler
    const wsConnectFunction = new lambda.Function(this, 'WebSocketConnectFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/websocket-connect')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });

    // WebSocket Disconnect Handler
    const wsDisconnectFunction = new lambda.Function(this, 'WebSocketDisconnectFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/websocket-disconnect')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });

    // WebSocket Message Handler
    const wsMessageFunction = new lambda.Function(this, 'WebSocketMessageFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/websocket-message')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });

    // WebSocket Broadcast Function (invoked by other Lambdas)
    const wsBroadcastFunction = new lambda.Function(this, 'WebSocketBroadcastFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/websocket-broadcast')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });

    // Create WebSocket API
    const webSocketApi = new apigw.WebSocketApi(this, 'BarkbaseWebSocketApi', {
      connectRouteOptions: {
        integration: new WebSocketLambdaIntegration('ConnectIntegration', wsConnectFunction),
      },
      disconnectRouteOptions: {
        integration: new WebSocketLambdaIntegration('DisconnectIntegration', wsDisconnectFunction),
      },
      defaultRouteOptions: {
        integration: new WebSocketLambdaIntegration('DefaultIntegration', wsMessageFunction),
      },
    });

    const webSocketStage = new apigw.WebSocketStage(this, 'BarkbaseWebSocketStage', {
      webSocketApi,
      stageName: 'production',
      autoDeploy: true,
    });

    // Grant WebSocket management permissions
    const wsManagementPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['execute-api:ManageConnections'],
      resources: [
        `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/*`
      ],
    });

    wsMessageFunction.addToRolePolicy(wsManagementPolicy);
    wsBroadcastFunction.addToRolePolicy(wsManagementPolicy);

    // Outputs
    new cdk.CfnOutput(this, "ApiUrl", {
      value: httpApi.url!,
      description: "The URL of the API Gateway",
    });

    new cdk.CfnOutput(this, "WebSocketUrl", {
      value: webSocketStage.url,
      description: "WebSocket URL for real-time connections",
    });
  }
}
