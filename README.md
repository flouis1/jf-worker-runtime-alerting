# Runtime Alert

## Overview

The `runtime-alert` project is designed to monitor and alert on vulnerabilities and risks associated with image tags in a Kubernetes cluster. It integrates with Elasticsearch for storing vulnerability data and Slack for sending alerts.

## Features

- Retrieves secrets for Slack webhook URL and Elasticsearch API key and URL.
- Processes image tags and their associated vulnerabilities.
- Stores vulnerability data in Elasticsearch.
- Sends alerts to Slack based on specified conditions.

## Setup

# Setting Up the Worker

## Required Secrets

Before running the worker, make sure the following secrets are set in your environment:

| Secret Name       | Description                                   |
| ----------------- | --------------------------------------------- |
| `Slack_URL`       | Webhook URL for sending alerts to Slack       |
| `Elastic_API_Key` | API key for authenticating with Elasticsearch |
| `Elastic_URL`     | Elasticsearch instance URL                    |

## Configuring JFrog CLI

### Add JFrog Platform Server Configuration

To configure JFrog CLI, run the following command:

```sh
jf config add <server ID>
```

Follow the prompts to enter the necessary details for your JFrog server.

### Add Secrets via JFrog CLI

Instead of setting secrets manually in the UI, you can also add them using JFrog CLI:

```sh
jf worker add-secret <secret-name>
```

Example:

```sh
jf worker add-secret Slack_URL
jf worker add-secret Elastic_API_Key
jf worker add-secret Elastic_URL
```

If you need to update an existing secret, use:

```sh
jf worker add-secret --edit <secret-name>
```


## Deployment Steps

1. Ensure the required secrets are properly configured.
2. Set the required environment variables in the Worker UI or via JFrog CLI.
3. Deploy the worker manually using the following command:
   ```sh
   jf worker deploy repo-sync-to-edge
   ```
4. The worker will automatically trigger when a workload change event occurs.
5. It will log vulnerabilities to Elasticsearch and send alerts to Slack if conditions are met.


## Alert Conditions
You can customize the alert conditions based on the severity, CVE ID, and namespace. These conditions can be set using the following optional parameters:


```sh
// Optional alert conditions
const alertSeverity: string | undefined = undefined; // Set severity level (e.g., 'high', 'medium')
const alertCveID: string | undefined = undefined;    // Set a specific CVE ID to filter by
const alertNamespace: string | undefined = 'testing'; // Set the namespace for filtering alerts
```

### Example 1: Filter by Severity
If you want to generate an alert only for vulnerabilities with a high severity (e.g., high), you can configure the alert conditions like this:


```sh
// Alert condition for high severity vulnerabilities
const alertSeverity: string | undefined = 'high'; // Only high severity vulnerabilities
const alertCveID: string | undefined = undefined; // No specific CVE ID filter
const alertNamespace: string | undefined = undefined; // No specific namespace filter
```

### Example 2: Filter by CVE ID
If you want to filter vulnerabilities by a specific CVE ID (e.g., CVE-2022-1234), you can adjust the conditions like this:


```sh
// Alert condition for a specific CVE ID
const alertSeverity: string | undefined = undefined; // No specific severity filter
const alertCveID: string | undefined = 'CVE-2022-1234'; // Only alerts for this CVE
const alertNamespace: string | undefined = undefined; // No specific namespace filter
```

### Example 3: Filter by Namespace
If you want to restrict the alerts to a specific namespace (e.g., production), you can configure the condition like this:

```sh

// Alert condition for a specific namespace
const alertSeverity: string | undefined = undefined; // No specific severity filter
const alertCveID: string | undefined = undefined; // No specific CVE ID filter
const alertNamespace: string | undefined = 'production'; // Only vulnerabilities in the production namespace
```


### Example 4: Combination of Filters
You can combine multiple conditions for more specificity. For example, if you want alerts only for high severity vulnerabilities of CVE-2022-1234 in the testing namespace, you can configure it like this:


```sh
// Combined alert conditions
const alertSeverity: string | undefined = 'high'; // Only high severity vulnerabilities
const alertCveID: string | undefined = 'CVE-2022-1234'; // Only alerts for CVE-2022-1234
const alertNamespace: string | undefined = 'testing'; // Only vulnerabilities in the testing namespace
```


### Example 5: No Filters
If you want all vulnerabilities to trigger alerts, without filtering by severity, CVE ID, or namespace:

```sh
// No filter on severity, CVE ID, or namespace
const alertSeverity: string | undefined = undefined; // No severity filter
const alertCveID: string | undefined = undefined;    // No CVE ID filter
const alertNamespace: string | undefined = undefined; // No namespace filter
```

These conditions will be used when generating alerts for vulnerabilities that meet the specified criteria.

---

