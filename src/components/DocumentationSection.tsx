import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileMusic, Upload, DollarSign, Image as ImageIcon, Music, Calendar, Shield, Archive, AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useBranding } from "@/hooks/useBrandingContext";

export const DocumentationSection = () => {
  const { dashboardName } = useBranding();
  
  return (
    <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <FileMusic className="w-6 h-6 text-primary" />
          Documentation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full space-y-2">
          {/* Getting Started */}
          <AccordionItem value="getting-started" className="border border-border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span className="font-semibold">Getting Started</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Welcome to {dashboardName}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {dashboardName} is your complete music distribution platform. Submit releases, track royalties, 
                  manage your catalog, and get your music on all major streaming platforms including Spotify, 
                  Apple Music, YouTube Music, and more.
                </p>
                <div className="bg-muted/50 p-3 rounded-md border border-border">
                  <p className="text-xs text-muted-foreground">
                    <strong>Quick Start:</strong> Navigate to the Overview tab to create your first release, 
                    view the Catalog tab to manage existing releases, or check Royalties to track your earnings.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Submissions */}
          <AccordionItem value="submissions" className="border border-border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                <span className="font-semibold">Release Submissions</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    How to Create a Release
                  </h4>
                  <ol className="text-sm text-muted-foreground space-y-2 ml-6 list-decimal">
                    <li>Click "New Release" button on the Overview tab</li>
                    <li>Fill in release details: title, artist name, genre, release date</li>
                    <li>Upload high-quality artwork (minimum 3000x3000px, square format)</li>
                    <li>Upload audio files (WAV or FLAC recommended, 16-bit/44.1kHz minimum)</li>
                    <li>Add metadata: copyright lines, catalog numbers, featured artists</li>
                    <li>Review and submit for approval</li>
                  </ol>
                </div>

                <div className="bg-muted/50 p-3 rounded-md border border-border space-y-2">
                  <h5 className="font-medium text-xs">Release Types:</h5>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                    <li><strong>Single:</strong> 1-3 tracks</li>
                    <li><strong>EP:</strong> 4-6 tracks</li>
                    <li><strong>Album:</strong> 7+ tracks</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Artwork Requirements
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                    <li>Minimum size: 3000x3000 pixels (recommended 4000x4000)</li>
                    <li>Format: JPG or PNG</li>
                    <li>Must be square (1:1 aspect ratio)</li>
                    <li>No text smaller than 72pt font size</li>
                    <li>RGB color mode, 300 DPI minimum</li>
                    <li>File size: Under 10MB</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    Audio Requirements
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                    <li>Format: WAV, FLAC, or high-quality MP3 (320kbps)</li>
                    <li>Sample rate: 44.1kHz, 48kHz, or 96kHz</li>
                    <li>Bit depth: 16-bit or 24-bit</li>
                    <li>No silence longer than 2 seconds at start/end</li>
                    <li>Properly mastered and mixed</li>
                    <li>File size: Under 500MB per track</li>
                  </ul>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-md">
                  <p className="text-xs text-yellow-300">
                    <strong>Important:</strong> Releases typically take 1-3 business days for review. 
                    Once approved, delivery to streaming platforms takes 2-5 business days.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Bulk Upload */}
          <AccordionItem value="bulk-upload" className="border border-border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                <span className="font-semibold">Bulk Upload</span>
                <Badge variant="outline" className="text-xs">CSV</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Upload multiple releases at once using a CSV file. Perfect for labels managing large catalogs.
                </p>
                <ol className="text-sm text-muted-foreground space-y-2 ml-6 list-decimal">
                  <li>Download the CSV template from the Bulk Upload tab</li>
                  <li>Fill in release information (one row per release)</li>
                  <li>Upload the completed CSV file</li>
                  <li>Match audio and artwork files to each release</li>
                  <li>Review and submit all releases at once</li>
                </ol>
                <div className="bg-muted/50 p-3 rounded-md border border-border">
                  <p className="text-xs text-muted-foreground">
                    <strong>CSV Columns:</strong> title, artist_name, genre, release_date, label_name, 
                    upc, featured_artists, copyright_line, phonographic_line, catalog_number
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Catalog Management */}
          <AccordionItem value="catalog" className="border border-border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <FileMusic className="w-4 h-4 text-primary" />
                <span className="font-semibold">Catalog Management</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Managing Your Releases</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    The Catalog tab provides advanced tools to manage your music releases.
                  </p>
                </div>

                <div>
                  <h5 className="font-medium text-xs mb-2">Bulk Actions</h5>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                    <li>Select multiple releases with checkboxes</li>
                    <li>Export selected releases to CSV</li>
                    <li>Request takedown for live releases</li>
                    <li>Archive releases for organization</li>
                  </ul>
                </div>

                <div>
                  <h5 className="font-medium text-xs mb-2">Release Statuses</h5>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="bg-yellow-500/20 border-yellow-500/30">Pending</Badge>
                      <span className="text-muted-foreground">Awaiting admin review</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="bg-green-500/20 border-green-500/30">Approved</Badge>
                      <span className="text-muted-foreground">Approved and ready for distribution</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="bg-blue-500/20 border-blue-500/30">Delivering</Badge>
                      <span className="text-muted-foreground">Being sent to streaming platforms</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="bg-red-500/20 border-red-500/30">Rejected</Badge>
                      <span className="text-muted-foreground">Does not meet requirements</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="bg-gray-500/20 border-gray-500/30">Taken Down</Badge>
                      <span className="text-muted-foreground">Removed from platforms</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-xs mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3" />
                    Takedown Requests
                  </h5>
                  <p className="text-sm text-muted-foreground mb-2">
                    For live releases (Approved/Delivering status), you must request a takedown before archiving or deleting.
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                    <li>Click "Request Takedown" on any approved release</li>
                    <li>Admin will process the takedown request</li>
                    <li>Once taken down, you can archive the release</li>
                  </ul>
                </div>

                <div>
                  <h5 className="font-medium text-xs mb-2 flex items-center gap-2">
                    <Archive className="w-3 h-3" />
                    Archive System
                  </h5>
                  <p className="text-sm text-muted-foreground mb-2">
                    Archive releases to keep your catalog organized without permanent deletion.
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                    <li>Archived releases are hidden from your active catalog</li>
                    <li>View archived releases by clicking "View Archived"</li>
                    <li>Restore archived releases at any time</li>
                    <li>Permanently delete from the archive if needed</li>
                  </ul>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Royalties */}
          <AccordionItem value="royalties" className="border border-border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="font-semibold">Royalties & Payments</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Understanding Your Royalties</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Track your earnings from streaming platforms and request payouts.
                  </p>
                </div>

                <div>
                  <h5 className="font-medium text-xs mb-2">Royalty Splits by Plan</h5>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div><strong>Free:</strong> 70/30 split (you receive 70%)</div>
                    <div><strong>Lite:</strong> 90/10 split (you receive 90%)</div>
                    <div><strong>Signature:</strong> 100% royalties to you</div>
                    <div><strong>Prestige:</strong> 100% distribution + 70% publishing royalties</div>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-xs mb-2">Requesting Payouts</h5>
                  <ol className="text-sm text-muted-foreground space-y-1 ml-6 list-decimal">
                    <li>Navigate to the Royalties tab</li>
                    <li>Review your current balance and payment history</li>
                    <li>Click "Request Payout" button</li>
                    <li>Admin will process your request within 5-7 business days</li>
                  </ol>
                </div>

                <div className="bg-muted/50 p-3 rounded-md border border-border">
                  <p className="text-xs text-muted-foreground">
                    <strong>Payment Schedule:</strong> Royalties are calculated monthly based on streaming 
                    platform reports. Minimum payout threshold is $50.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Account Settings */}
          <AccordionItem value="account" className="border border-border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="font-semibold">Account & Settings</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="space-y-4">
                <div>
                  <h5 className="font-medium text-xs mb-2">Managing Your Profile</h5>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                    <li>Update artist name and display name</li>
                    <li>Upload profile picture</li>
                    <li>Set label name (Signature/Prestige tiers)</li>
                    <li>Configure timezone for account manager (Prestige tier)</li>
                  </ul>
                </div>

                <div>
                  <h5 className="font-medium text-xs mb-2">Subscription Plans</h5>
                  <p className="text-sm text-muted-foreground mb-2">
                    Upgrade your plan to unlock additional features and better royalty splits.
                  </p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div><strong>Free:</strong> Basic distribution, 70% royalties</div>
                    <div><strong>Lite ($14.99/year):</strong> 90% royalties, same-day support</div>
                    <div><strong>Signature ($29.99/year):</strong> 100% royalties, priority approval</div>
                    <div><strong>Prestige ($51.29/year):</strong> Publishing, dedicated account manager</div>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-xs mb-2">Client Invitations</h5>
                  <p className="text-sm text-muted-foreground mb-2">
                    Signature and Prestige members can invite clients with granular permissions.
                  </p>
                  <div className="bg-muted/50 p-2 rounded-md border border-border">
                    <p className="text-xs text-muted-foreground">
                      Permission categories: Catalog, Royalties, Announcements, Support, Settings
                    </p>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Publishing */}
          <AccordionItem value="publishing" className="border border-border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <FileMusic className="w-4 h-4 text-primary" />
                <span className="font-semibold">Publishing Submissions</span>
                <Badge variant="outline" className="text-xs">Prestige</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Prestige tier members can submit songs for publishing rights management and PRO enrollment.
                </p>
                <ol className="text-sm text-muted-foreground space-y-1 ml-6 list-decimal">
                  <li>Navigate to the Publishing tab</li>
                  <li>Enter song title, type, and ISRC codes</li>
                  <li>Add all writers and publishers with their shares</li>
                  <li>Ensure total performance share equals 100%</li>
                  <li>Submit for admin review</li>
                </ol>
                <div className="bg-muted/50 p-3 rounded-md border border-border">
                  <p className="text-xs text-muted-foreground">
                    Admin will review and either send to PRO or decline with feedback.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Troubleshooting */}
          <AccordionItem value="troubleshooting" className="border border-border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-primary" />
                <span className="font-semibold">Troubleshooting</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="space-y-4">
                <div>
                  <h5 className="font-medium text-xs mb-2">Common Issues</h5>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div>
                      <strong>Q: My release was rejected. What do I do?</strong>
                      <p>Check the rejection reason in your notifications. Common issues include improper audio quality, incorrect artwork dimensions, or metadata errors. Fix the issues and resubmit.</p>
                    </div>
                    <div>
                      <strong>Q: How long does distribution take?</strong>
                      <p>Review: 1-3 business days. Distribution to platforms: 2-5 business days after approval. Total: 3-8 business days.</p>
                    </div>
                    <div>
                      <strong>Q: Can I delete a pending release?</strong>
                      <p>No, pending releases cannot be deleted. Wait for admin review, then you can archive after approval/rejection.</p>
                    </div>
                    <div>
                      <strong>Q: I can't find my release in the catalog.</strong>
                      <p>Check if you're viewing archived releases. Click "View Active" if in archive view, or use the search filter.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-md">
                  <p className="text-xs text-yellow-300">
                    <strong>Still need help?</strong> Contact support at contact@trackball.cc for assistance with any issues not covered here.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};