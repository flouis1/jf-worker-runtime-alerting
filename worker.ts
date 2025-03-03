import { PlatformContext } from 'jfrog-workers';

export default async (
  context: PlatformContext,
  data: any
): Promise<{ message: string }> => {
  // Retrieving secrets
  const slackWebhookUrl = context.secrets.get('Slack_URL'); // Slack channel webhook URL
  const elasticApiKey = context.secrets.get('Elastic_API_Key'); // Elasticsearch API KEY
  const elasticUrl = context.secrets.get('Elastic_URL'); // Elasticsearch URL
  const elasticIndex = "runtime_leap"; // Elasticsearch index name

  // Optional alert conditions
  const alertSeverity: string | undefined = undefined;
  const alertCveID: string | undefined = undefined;
  const alertNamespace: string | undefined = 'testing';

  const alertBlocks: any[] = [];

  const pushAlertBlock = (text: string) => {
    alertBlocks.push(
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text
        }
      },
      { type: "divider" }
    );
    console.log(`${text}`)
  };

  try {
    console.log(`Worker is connected to cluster ${data.workload_changed_object.cluster}`);
    
    let shouldAlert = false;
    let bulkData: string[] = []; // Array to store the bulk lines

    data.image_tags_object.forEach((imageTag: any) => {
      // Ensure vulnerabilities is always an array
      let vulnerabilities = Array.isArray(imageTag.vulnerabilities) ? imageTag.vulnerabilities.map((vuln: any) => {
        return {
          CVEid: vuln.cve_id,
          severity: vuln.severity,
          description: vuln.description,
          package: vuln.package
        };
      }) : [];

      vulnerabilities.forEach((vuln: any) => {
        const stat = {
          CVEid: vuln.CVEid,
          severity: vuln.severity,
          imageName: imageTag.name,
          imageTag: imageTag.tag,
          cluster: data.workload_changed_object.cluster,
          name: data.workload_changed_object.name,
          namespace: data.workload_changed_object.namespace,
          timestamp: new Date().toISOString(),
          vulnerabilities: vulnerabilities
        };

        bulkData.push(
          JSON.stringify({ index: { _index: elasticIndex } }), 
          JSON.stringify(stat)
        );

        if (
          (alertSeverity && vuln.severity === alertSeverity) || 
          (alertCveID && vuln.cve_id === alertCveID) || 
          (alertNamespace && new RegExp(alertNamespace).test(data.workload_changed_object.namespace))
        ) {
          shouldAlert = true;
          //pushAlertBlock(`🚨 *Security Alert!*\n\n*Details:*\n• *🔍 CVE ID:* ${stat.CVEid}\n• *📦 Image Name:* ${stat.imageName}\n• *🏷️ Image Tag:* ${stat.imageTag}\n• *🌐 Cluster:* ${stat.cluster}\n• *📛 Name:* ${stat.name}\n• *🗂️ Namespace:* ${stat.namespace}`);
        }
      });

      // Alert if risks are present
      if (imageTag.risks && imageTag.risks.length > 0) {
        shouldAlert = true;
        pushAlertBlock(`⚠️ *Risk Alert!*\n*Workload Details:*\n• *Name:* ${data.workload_changed_object.name}\n• *Namespace:* ${data.workload_changed_object.namespace}\n• *Cluster:* ${data.workload_changed_object.cluster}\n• *Risks:* ${data.workload_changed_object.risks}\n*Image Details:*\n• *📦 Name:* ${imageTag.name}\n• *🏷️ Tag:* ${imageTag.tag}\n• *⚠️ Risks:* ${imageTag.risks.join(", ")}`);
      }
    });

    const indexCheck = await context.clients.axios.get(`${elasticUrl}/${elasticIndex}`, {
      headers: {
        'Authorization': `ApiKey ${elasticApiKey}`
      }
    });
    console.log(`Elasticsearch index check: ${indexCheck.status}`);

    if (elasticUrl && elasticApiKey && bulkData.length > 0) {
      const bulkRequest = bulkData.join("\n") + "\n";
      console.log("Sending Bulk data to Elasticsearch...");
      const elastic_bulk = await context.clients.axios.post(`${elasticUrl}/_bulk`, bulkRequest, {
        headers: {
          'Authorization': `ApiKey ${elasticApiKey}`,
          'Content-Type': 'application/x-ndjson'
        }
      });
      console.log(`Data successfully sent to Elasticsearch with status ${elastic_bulk.status}`);
    } else {
      console.warn("Elasticsearch URL, API key, or bulkData is missing. No data sent.");
    }

    if (slackWebhookUrl) {
      if (!shouldAlert) {
        pushAlertBlock("✅ No issues detected in the image scan.");
      }
      
      try {
        console.log("Sending alert to Slack...");
        const slackResponse = await context.clients.axios.post(slackWebhookUrl, {
          blocks: alertBlocks,
        });
        console.log(`Slack response status: ${slackResponse.status}`);
      } catch (slackError) {
        console.error(
          `Failed to send alert to Slack. Status: ${slackError.response?.status || "<none>"} - ${slackError.message}`
        );
      }
    } else {
      console.warn('Slack webhook URL is not set. No alert sent.');
    }

    console.log("Successfully processed information");
  } catch (error) {
    console.error(
      `Request failed with status code ${error.response?.status || "<none>"} caused by: ${error.message}`
    );
  }

  return { message: "proceed" };
};