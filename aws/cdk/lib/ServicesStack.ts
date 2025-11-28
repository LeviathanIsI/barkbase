/**
 * @deprecated This stack has been split into domain-specific service stacks.
 * 
 * The following stacks now handle the functionality that was in ServicesStack:
 * - AuthServicesStack: /api/v1/auth/* routes
 * - EntityServicesStack: /api/v1/pets/*, /api/v1/owners/*, /api/v1/staff/*
 * - OperationsServicesStack: /api/v1/bookings/*, /api/v1/runs/*, /api/v1/kennels/*
 * - FeaturesServicesStack: /api/v1/tasks/*, /api/v1/notes/*, /api/v1/incidents/*
 * - ConfigServicesStack: /api/v1/roles/*, /api/v1/tenants/*, /api/v1/facility/*
 * - UserServicesStack: /api/v1/profiles/*, /api/v1/users/*
 * - FinancialServicesStack: /api/v1/payments/*, /api/v1/invoices/*, /api/v1/billing/*
 * - AnalyticsServicesStack: /api/v1/dashboard/*, /api/v1/reports/*, /api/v1/calendar/*
 * - AdminServicesStack: /api/v1/admin/*, file upload/download
 * - PropertiesServicesStack: /api/v2/properties/*
 * 
 * This file is kept as a stub for reference. Do NOT instantiate this stack.
 * The CloudFormation stack Barkbase-ServicesStack-dev can be safely deleted
 * from AWS once all new domain stacks are deployed and verified.
 */
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export interface ServicesStackProps extends cdk.StackProps {
  stage: string;
}

/**
 * @deprecated - Use the domain-specific service stacks instead.
 */
export class ServicesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ServicesStackProps) {
    super(scope, id, props);
    
    // This stack is intentionally empty.
    // All resources have been moved to domain-specific stacks.
    cdk.Tags.of(this).add("Status", "deprecated");
    cdk.Tags.of(this).add("Stage", props.stage);
  }
}
