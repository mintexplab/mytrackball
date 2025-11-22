/**
 * Trackball Distribution Email Template
 * Reusable email template with branded styling
 */

interface EmailTemplateProps {
  title: string;
  previewText?: string;
  content: string;
  ctaText?: string;
  ctaLink?: string;
  footerText?: string;
  logoUrl?: string;
}

export const generateEmailHTML = ({
  title,
  previewText = "New notification from Trackball Distribution",
  content,
  ctaText,
  ctaLink,
  footerText = "Need help? Contact us at contact@trackball.cc",
  logoUrl = `https://${Deno.env.get('AWS_S3_BUCKET_NAME')}.s3.${Deno.env.get('AWS_REGION') || 'us-east-1'}.amazonaws.com/email-assets/trackball-logo.png`
}: EmailTemplateProps): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Rubik', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <!-- Preview text -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${previewText}
  </div>

  <!-- Email wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0a0a0a;">
    <tr>
      <td style="padding: 40px 20px;">
        <!-- Main container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #000000; border-radius: 12px; overflow: hidden; box-shadow: 0 0 40px rgba(220, 38, 38, 0.15);">
          
          <!-- Header with logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px; text-align: center;">
              <img src="${logoUrl}" alt="Trackball Distribution" style="width: 80px; height: 80px; margin: 0 auto 16px; display: block;" />
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                TRACKBALL DISTRIBUTION
              </h1>
              <div style="margin-top: 8px; color: rgba(255, 255, 255, 0.9); font-size: 12px; letter-spacing: 2px; font-weight: 500;">
                XZ1 RECORDING VENTURES
              </div>
            </td>
          </tr>

          <!-- Content section -->
          <tr>
            <td style="padding: 40px 40px 32px; background-color: #000000;">
              <h2 style="margin: 0 0 24px; color: #ffffff; font-size: 24px; font-weight: 600; line-height: 1.3;">
                ${title}
              </h2>
              <div style="color: #d1d5db; font-size: 16px; line-height: 1.6;">
                ${content}
              </div>
            </td>
          </tr>

          ${ctaText && ctaLink ? `
          <!-- Call to action button -->
          <tr>
            <td style="padding: 0 40px 40px; background-color: #000000; text-align: center;">
              <a href="${ctaLink}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3); transition: transform 0.2s;">
                ${ctaText}
              </a>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #0a0a0a; border-top: 1px solid #1f1f1f;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="color: #6b7280; font-size: 14px; line-height: 1.5; text-align: center;">
                    ${footerText}
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 16px; color: #4b5563; font-size: 12px; text-align: center;">
                    © 2025 XZ1 Recording Ventures. All rights reserved.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Spacer -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 20px auto 0;">
          <tr>
            <td style="text-align: center; color: #4b5563; font-size: 12px; line-height: 1.5;">
              <p style="margin: 0;">
                This email was sent from Trackball Distribution
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};
