/**
 * Represents mappings to cloud resources
 */
interface CloudConfig {
    /**
     * The client ID for Cognito
     */
    clientId: string;
    /**
     * The REST API endpoint URL
     */
    apiEndpoint: string;
    /**
     * The dynamo table name
     */
    tableName: string;
    /**
     * The S3 bucket name
     */
    bucketName: string;
    /**
     * The ID of the Cognito identity pool
     */
    identityPool: string;
    /**
     * The provider name of the Cognito user pool
     */
    userPool: string;
}