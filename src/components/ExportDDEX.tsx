import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download } from "lucide-react";

interface ExportDDEXProps {
  releaseId: string;
}

const ExportDDEX = ({ releaseId }: ExportDDEXProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ddexConfig, setDdexConfig] = useState({
    partyId: "",
    partyName: "",
    deliveryDestination: "",
  });

  const generateDDEXXML = async () => {
    setLoading(true);
    try {
      // Fetch release and tracks data
      const { data: release, error: releaseError } = await supabase
        .from("releases")
        .select(`
          *,
          tracks (*)
        `)
        .eq("id", releaseId)
        .single();

      if (releaseError) throw releaseError;

      const messageId = crypto.randomUUID();
      const currentDateTime = new Date().toISOString();
      const releaseDate = release.release_date || new Date().toISOString().split('T')[0];
      const year = new Date(releaseDate).getFullYear();

      // Build tracks XML
      const tracksXML = release.tracks.map((track: any, idx: number) => `
        <SoundRecording>
            <SoundRecordingId>
                <ISRC>${track.isrc || ''}</ISRC>
                <ProprietaryId Namespace="${ddexConfig.partyId}">${track.id}</ProprietaryId>
            </SoundRecordingId>
            <ResourceReference>A${idx + 1}</ResourceReference>
            <ReferenceTitle>
                <TitleText>${track.title}</TitleText>
            </ReferenceTitle>
            <Duration>PT${Math.floor((track.duration || 0) / 60)}M${(track.duration || 0) % 60}S</Duration>
            <SoundRecordingDetailsByTerritory>
                <TerritoryCode>Worldwide</TerritoryCode>
                <Title TitleType="DisplayTitle">
                    <TitleText>${track.title}</TitleText>
                </Title>
                <DisplayArtist>
                    <PartyName>
                        <FullName>${release.artist_name}</FullName>
                    </PartyName>
                    <ArtistRole>MainArtist</ArtistRole>
                </DisplayArtist>
                ${track.featured_artists?.map((artist: string) => `
                <DisplayArtist>
                    <PartyName>
                        <FullName>${artist}</FullName>
                    </PartyName>
                    <ArtistRole>FeaturedArtist</ArtistRole>
                </DisplayArtist>`).join('') || ''}
                <LabelName>${release.label_name || ''}</LabelName>
                <PLine>
                    <Year>${year}</Year>
                    <PLineText>${release.phonographic_line || `${year} ${release.label_name || ''}`}</PLineText>
                </PLine>
                <Genre>
                    <GenreText>${release.genre || ''}</GenreText>
                </Genre>
                <ParentalWarningType>NotExplicit</ParentalWarningType>
            </SoundRecordingDetailsByTerritory>
        </SoundRecording>`).join('');

      const resourceReferences = release.tracks.map((_: any, idx: number) => 
        `<ReleaseResourceReference ReleaseResourceType="PrimaryResource">A${idx + 1}</ReleaseResourceReference>`
      ).join('\n                ');

      const trackReleases = release.tracks.map((track: any, idx: number) => `
        <Release IsMainRelease="false">
            <ReleaseId>
                <ISRC>${track.isrc || ''}</ISRC>
            </ReleaseId>
            <ReleaseReference>R${idx + 1}</ReleaseReference>
            <ReferenceTitle>
                <TitleText>${track.title}</TitleText>
            </ReferenceTitle>
            <ReleaseResourceReferenceList>
                <ReleaseResourceReference ReleaseResourceType="PrimaryResource">A${idx + 1}</ReleaseResourceReference>
            </ReleaseResourceReferenceList>
            <ReleaseType>TrackRelease</ReleaseType>
            <ReleaseDetailsByTerritory>
                <TerritoryCode>Worldwide</TerritoryCode>
                <DisplayArtistName>${release.artist_name}</DisplayArtistName>
                <LabelName>${release.label_name || ''}</LabelName>
                <Title TitleType="DisplayTitle">
                    <TitleText>${track.title}</TitleText>
                </Title>
                <DisplayArtist>
                    <PartyName>
                        <FullName>${release.artist_name}</FullName>
                    </PartyName>
                    <ArtistRole>MainArtist</ArtistRole>
                </DisplayArtist>
                <ParentalWarningType>NotExplicit</ParentalWarningType>
                <Genre>
                    <GenreText>${release.genre || ''}</GenreText>
                </Genre>
                <ReleaseDate>${releaseDate}</ReleaseDate>
            </ReleaseDetailsByTerritory>
            <PLine>
                <Year>${year}</Year>
                <PLineText>${release.phonographic_line || `${year} ${release.label_name || ''}`}</PLineText>
            </PLine>
        </Release>`).join('');

      const resourceGroupItems = release.tracks.map((_: any, idx: number) => `
                        <ResourceGroupContentItem>
                            <SequenceNumber>${idx + 1}</SequenceNumber>
                            <ResourceType>SoundRecording</ResourceType>
                            <ReleaseResourceReference ReleaseResourceType="PrimaryResource">A${idx + 1}</ReleaseResourceReference>
                        </ResourceGroupContentItem>`).join('');

      const dealReferences = ['R0', ...release.tracks.map((_: any, idx: number) => `R${idx + 1}`)].map(ref => 
        `<DealReleaseReference>${ref}</DealReleaseReference>`
      ).join('\n            ');

      const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/382" xmlns:xs="http://www.w3.org/2001/XMLSchema-instance" LanguageAndScriptCode="en" MessageSchemaVersionId="ern/382" xs:schemaLocation="http://ddex.net/xml/ern/382 http://ddex.net/xml/ern/382/release-notification.xsd">
    <MessageHeader>
        <MessageId>${messageId}</MessageId>
        <MessageSender>
            <PartyId>${ddexConfig.partyId}</PartyId>
            <PartyName>
                <FullName>${ddexConfig.partyName}</FullName>
            </PartyName>
        </MessageSender>
        <MessageRecipient>
            <PartyName>
                <FullName>${ddexConfig.deliveryDestination}</FullName>
            </PartyName>
        </MessageRecipient>
        <MessageCreatedDateTime>${currentDateTime}</MessageCreatedDateTime>
    </MessageHeader>
    <ResourceList>${tracksXML}
    </ResourceList>
    <ReleaseList>
        <Release IsMainRelease="true">
            <ReleaseId>
                <ICPN IsEan="true">${release.upc || ''}</ICPN>
            </ReleaseId>
            <ReleaseReference>R0</ReleaseReference>
            <ReferenceTitle>
                <TitleText>${release.title}</TitleText>
            </ReferenceTitle>
            <ReleaseResourceReferenceList>
                ${resourceReferences}
            </ReleaseResourceReferenceList>
            <ReleaseType>${release.tracks.length === 1 ? 'Single' : 'Album'}</ReleaseType>
            <ReleaseDetailsByTerritory>
                <TerritoryCode>Worldwide</TerritoryCode>
                <DisplayArtistName>${release.artist_name}</DisplayArtistName>
                <LabelName>${release.label_name || ''}</LabelName>
                <Title TitleType="DisplayTitle">
                    <TitleText>${release.title}</TitleText>
                </Title>
                <DisplayArtist>
                    <PartyName>
                        <FullName>${release.artist_name}</FullName>
                    </PartyName>
                    <ArtistRole>MainArtist</ArtistRole>
                </DisplayArtist>
                ${release.featured_artists?.map((artist: string) => `
                <DisplayArtist>
                    <PartyName>
                        <FullName>${artist}</FullName>
                    </PartyName>
                    <ArtistRole>FeaturedArtist</ArtistRole>
                </DisplayArtist>`).join('') || ''}
                <ParentalWarningType>NotExplicit</ParentalWarningType>
                <ResourceGroup>
                    <ResourceGroup>
                        <Title>
                            <TitleText>Disc ${release.disc_number || 1}</TitleText>
                        </Title>
                        <SequenceNumber>${release.disc_number || 1}</SequenceNumber>${resourceGroupItems}
                    </ResourceGroup>
                </ResourceGroup>
                <Genre>
                    <GenreText>${release.genre || ''}</GenreText>
                </Genre>
                <ReleaseDate>${releaseDate}</ReleaseDate>
            </ReleaseDetailsByTerritory>
            <PLine>
                <Year>${year}</Year>
                <PLineText>${release.phonographic_line || `${year} ${release.label_name || ''}`}</PLineText>
            </PLine>
            <CLine>
                <Year>${year}</Year>
                <CLineText>${release.copyright_line || `${year} ${release.label_name || ''}`}</CLineText>
            </CLine>
        </Release>${trackReleases}
    </ReleaseList>
    <DealList>
        <ReleaseDeal>
            ${dealReferences}
            <Deal>
                <DealTerms>
                    <CommercialModelType>SubscriptionModel</CommercialModelType>
                    <CommercialModelType>AdvertisementSupportedModel</CommercialModelType>
                    <Usage>
                        <UseType>OnDemandStream</UseType>
                    </Usage>
                    <TerritoryCode>Worldwide</TerritoryCode>
                    <ValidityPeriod>
                        <StartDate>${releaseDate}</StartDate>
                    </ValidityPeriod>
                </DealTerms>
            </Deal>
        </ReleaseDeal>
    </DealList>
</ern:NewReleaseMessage>`;

      // Download the XML
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${release.title.replace(/[^a-z0-9]/gi, '_')}_DDEX.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("DDEX XML exported successfully!");
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export DDEX
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export DDEX XML</DialogTitle>
          <DialogDescription>
            Configure DDEX delivery settings for this release
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="partyId">DDEX Party ID</Label>
            <Input
              id="partyId"
              value={ddexConfig.partyId}
              onChange={(e) => setDdexConfig({ ...ddexConfig, partyId: e.target.value })}
              placeholder="e.g., PADPIDA2020011507K"
            />
          </div>
          <div>
            <Label htmlFor="partyName">DDEX Party Name</Label>
            <Input
              id="partyName"
              value={ddexConfig.partyName}
              onChange={(e) => setDdexConfig({ ...ddexConfig, partyName: e.target.value })}
              placeholder="e.g., Your Company Name"
            />
          </div>
          <div>
            <Label htmlFor="deliveryDestination">Delivery Destination (DSP)</Label>
            <Input
              id="deliveryDestination"
              value={ddexConfig.deliveryDestination}
              onChange={(e) => setDdexConfig({ ...ddexConfig, deliveryDestination: e.target.value })}
              placeholder="e.g., YouTube, Spotify, Apple Music"
            />
          </div>
          <Button
            onClick={generateDDEXXML}
            disabled={loading || !ddexConfig.partyId || !ddexConfig.partyName || !ddexConfig.deliveryDestination}
            className="w-full"
          >
            {loading ? "Generating..." : "Generate & Download XML"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDDEX;
