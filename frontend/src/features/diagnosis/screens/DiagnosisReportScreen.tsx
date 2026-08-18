import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getDiagnosisReport } from '../state/diagnosisReport';
import { AppButton } from '../../../shared/components/AppButton';
import { APP_NAME, RESULT_GUIDANCE } from '../../../shared/brand';
import { appColors } from '../../../shared/theme/colors';
import Svg, { Polygon } from 'react-native-svg';
import type { DiagnosisPrediction } from '../api/diagnosisApi';

type DiagnosisReportScreenProps = {
  backToHistory?: boolean;
};

const logo = require('../../../../assets/logo/New Logo Cek Gigi.png');

function formatDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getResultLabel(label?: string | null) {
  return label?.trim() || 'Tidak terdeteksi';
}

function getDoctorName(name?: string | null) {
  return name?.trim() || '-';
}

function getImageMimeType(uri: string, contentType?: string | null) {
  const normalizedContentType = contentType?.split(';')[0]?.trim().toLowerCase();
  if (normalizedContentType?.startsWith('image/')) {
    return normalizedContentType;
  }

  const path = uri.split('?')[0].toLowerCase();
  if (path.endsWith('.png')) {
    return 'image/png';
  }
  if (path.endsWith('.webp')) {
    return 'image/webp';
  }
  return 'image/jpeg';
}

function getHeaderValue(headers: Record<string, string>, name: string) {
  const expectedName = name.toLowerCase();
  const matchingHeader = Object.entries(headers).find(
    ([headerName]) => headerName.toLowerCase() === expectedName,
  );
  return matchingHeader?.[1];
}

function blobToDataUri(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Format gambar rontgen tidak dapat dibaca.'));
    };
    reader.onerror = () => reject(new Error('Gambar rontgen gagal dibaca.'));
    reader.readAsDataURL(blob);
  });
}

async function imageUriToDataUri(uri: string) {
  if (uri.startsWith('data:')) {
    return uri;
  }

  if (Platform.OS === 'web') {
    const response = await fetch(uri, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Gambar rontgen gagal diunduh (HTTP ${response.status}).`);
    }
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) {
      throw new Error('File rontgen yang diterima bukan gambar yang valid.');
    }
    return blobToDataUri(blob);
  }

  let readableUri = uri;
  let temporaryUri: string | null = null;
  let mimeType = getImageMimeType(uri);

  try {
    if (/^https?:\/\//i.test(uri)) {
      if (!FileSystem.cacheDirectory) {
        throw new Error('Penyimpanan sementara tidak tersedia.');
      }

      temporaryUri = `${FileSystem.cacheDirectory}radia-xray-${Date.now()}`;
      const download = await FileSystem.downloadAsync(uri, temporaryUri);
      if (download.status < 200 || download.status >= 300) {
        throw new Error(`Gambar rontgen gagal diunduh (HTTP ${download.status}).`);
      }
      readableUri = download.uri;
      mimeType = getImageMimeType(uri, getHeaderValue(download.headers, 'content-type'));
    }

    const base64 = await FileSystem.readAsStringAsync(readableUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:${mimeType};base64,${base64}`;
  } finally {
    if (temporaryUri) {
      await FileSystem.deleteAsync(temporaryUri, { idempotent: true }).catch(() => undefined);
    }
  }
}

function buildPredictionOverlay(
  predictions: DiagnosisPrediction[],
  imageWidth?: number | null,
  imageHeight?: number | null,
) {
  const sourceWidth = imageWidth && imageWidth > 0 ? imageWidth : 640;
  const sourceHeight = imageHeight && imageHeight > 0 ? imageHeight : 640;
  const polygons = predictions
    .map((prediction) => {
      const points = (prediction.points ?? [])
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
        .map((point) => `${point.x},${point.y}`)
        .join(' ');

      return points
        ? `<polygon points="${points}" fill="rgba(139, 92, 246, 0.30)" stroke="#6D4CC3" stroke-width="2" />`
        : '';
    })
    .join('');

  if (!polygons) {
    return '';
  }

  return `<svg class="segmentation" viewBox="0 0 ${sourceWidth} ${sourceHeight}" preserveAspectRatio="none">${polygons}</svg>`;
}

async function printReportHtmlOnWeb(html: string) {
  if (typeof document === 'undefined') {
    throw new Error('Fitur cetak tidak tersedia pada perangkat ini.');
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'RADIA PDF Report');
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '1px',
    height: '1px',
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
  });
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    iframe.remove();
    throw new Error('Dokumen PDF gagal disiapkan.');
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  const images = Array.from(frameDocument.images);
  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve, reject) => {
          if (image.complete) {
            image.naturalWidth > 0
              ? resolve()
              : reject(new Error('Gambar rontgen gagal dimuat ke dokumen PDF.'));
            return;
          }
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener(
            'error',
            () => reject(new Error('Gambar rontgen gagal dimuat ke dokumen PDF.')),
            { once: true },
          );
        }),
    ),
  );

  await new Promise<void>((resolve) => {
    frameWindow.requestAnimationFrame(() => frameWindow.requestAnimationFrame(() => resolve()));
  });

  const cleanup = () => iframe.remove();
  frameWindow.addEventListener('afterprint', cleanup, { once: true });
  frameWindow.focus();
  frameWindow.print();
  window.setTimeout(cleanup, 60_000);
}

function buildReportHtml(
  report: NonNullable<ReturnType<typeof getDiagnosisReport>>,
  embeddedImageUri: string,
) {
  const resultLabel = getResultLabel(report.response.data.resultLabel);
  const dateLabel = formatDate(report.createdAt);
  const doctorName = getDoctorName(report.doctor?.fullname);
  const doctorPhone = report.doctor?.phone || '-';
  const doctorPosition = report.doctor?.position || 'Dokter Gigi';
  const note = report.draft.doctorNote?.trim() || '-';
  const sourceWidth = report.response.data.imageWidth || 640;
  const sourceHeight = report.response.data.imageHeight || 640;
  const imageScale = Math.min(310 / sourceWidth, 220 / sourceHeight);
  const printImageWidth = Math.max(1, Math.round(sourceWidth * imageScale));
  const printImageHeight = Math.max(1, Math.round(sourceHeight * imageScale));
  const predictionOverlay = buildPredictionOverlay(
    report.response.data.predictions ?? [],
    sourceWidth,
    sourceHeight,
  );
  const imageTag = `
    <div class="xray-frame" style="width: ${printImageWidth}px; height: ${printImageHeight}px">
      <img class="xray" src="${escapeHtml(embeddedImageUri)}" alt="Radiograf dental" />
      ${predictionOverlay}
    </div>`;

  return `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          @page { size: A4; margin: 14mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #111; padding: 18px; margin: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .brand { text-align: center; color: #3D2A73; font-size: 24px; font-weight: 800; margin-bottom: 22px; }
          .line { border-top: 2px solid #6D4CC3; margin: 0 0 8px; }
          .meta { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 42px; }
          .info { font-size: 12px; line-height: 1.45; margin-left: 8px; }
          .image-wrap { text-align: center; margin: 36px 0 8px; }
          .xray-frame { position: relative; max-width: 100%; margin: 0 auto; overflow: hidden; background: #EFE9FF; }
          .xray { display: block; width: 100%; height: 100%; object-fit: contain; }
          .segmentation { position: absolute; inset: 0; width: 100%; height: 100%; }
          .image-number { text-align: center; font-size: 12px; margin-bottom: 14px; }
          .result-title { text-align: center; font-family: Georgia, serif; font-size: 25px; margin: 0; }
          .result { text-align: center; font-family: Georgia, serif; font-size: 32px; font-weight: 700; margin: 6px 0 34px; }
          .guidance { padding: 14px 16px; background: #F7F3FF; border-left: 4px solid #8B5CF6; font-size: 12px; line-height: 1.5; margin: 0 8px 28px; }
          .note-title { font-size: 12px; font-weight: 700; margin: 0 0 14px 8px; }
          .note { font-size: 12px; line-height: 1.45; margin: 0 8px; }
          .sign-date { text-align: right; margin-top: 56px; font-size: 12px; font-weight: 700; }
          .sign-name { text-align: right; margin-top: 82px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="brand">${APP_NAME}</div>
        <div class="line"></div>
        <div class="meta">
          <span>Nomor : ${escapeHtml(report.resultNumber)}</span>
          <span>Jakarta, ${escapeHtml(dateLabel)}</span>
        </div>
        <div class="info">
          Nama Dokter: ${escapeHtml(doctorName)}<br />
          No.Telp: ${escapeHtml(doctorPhone)}<br />
          Posisi: ${escapeHtml(doctorPosition)}<br />
          Homebase: ${escapeHtml(report.draft.homebaseType.replace('_', ' '))}<br />
          Nama Homebase: ${escapeHtml(report.draft.homebaseName)}<br /><br />
          Alamat Homebase: ${escapeHtml(report.draft.homebaseAddress)}
        </div>
        <div class="image-wrap">${imageTag}</div>
        <div class="image-number">No. ${escapeHtml(report.resultNumber)}</div>
        <p class="result-title">Hasil :</p>
        <p class="result">${escapeHtml(resultLabel)}</p>
        <p class="guidance">${escapeHtml(RESULT_GUIDANCE)}</p>
        <p class="note-title">Catatan Diagnosa Dokter:</p>
        <p class="note">${escapeHtml(note)}</p>
        <p class="sign-date">Jakarta, ${escapeHtml(dateLabel)}</p>
        <p class="sign-name">dr. ${escapeHtml(doctorName)}</p>
      </body>
    </html>
  `;
}

export function DiagnosisReportScreen({ backToHistory = false }: DiagnosisReportScreenProps = {}) {
  const { width } = useWindowDimensions();
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const report = getDiagnosisReport();
  const backRoute = backToHistory ? '/history' : '/dashboard';

  const reportWidth = Math.min(width - 34, 720);
  const dateLabel = useMemo(() => (report ? formatDate(report.createdAt) : ''), [report]);

  if (!report) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Report tidak tersedia</Text>
          <AppButton title={backToHistory ? 'Kembali ke Riwayat' : 'Kembali ke Dashboard'} onPress={() => router.replace(backRoute)} />
        </View>
      </SafeAreaView>
    );
  }

  const currentReport = report;
  const resultLabel = getResultLabel(currentReport.response.data.resultLabel);
  const reportImageUri = currentReport.response.data.imageUrl || currentReport.draft.imageUri;
  const doctorName = getDoctorName(currentReport.doctor?.fullname);
  const doctorPosition = report.doctor?.position || 'Dokter Gigi';
  const doctorPhone = report.doctor?.phone || '-';
  const note = report.draft.doctorNote?.trim() || '-';

  async function handleDownloadPdf() {
    if (isPreparingPdf) {
      return;
    }

    setIsPreparingPdf(true);
    try {
      if (!reportImageUri) {
        throw new Error('Gambar rontgen tidak tersedia untuk dimasukkan ke PDF.');
      }

      const embeddedImageUri = await imageUriToDataUri(reportImageUri);
      const html = buildReportHtml(currentReport, embeddedImageUri);

      if (Platform.OS === 'web') {
        await printReportHtmlOnWeb(html);
        return;
      }

      const pdf = await Print.printToFileAsync({
        html,
        base64: true,
      });
      let pdfUri = pdf.uri;

      if (pdf.base64 && FileSystem.cacheDirectory) {
        const safeResultNumber = currentReport.resultNumber.replace(/[^a-zA-Z0-9_-]/g, '-');
        pdfUri = `${FileSystem.cacheDirectory}RADIA-${safeResultNumber}.pdf`;
        await FileSystem.writeAsStringAsync(pdfUri, pdf.base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('PDF berhasil dibuat', pdfUri);
        return;
      }

      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Simpan Report ${currentReport.resultNumber}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'PDF gagal dibuat';
      Alert.alert('Download gagal', message);
    } finally {
      setIsPreparingPdf(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali ke dashboard"
            onPress={() => router.replace(backRoute)}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <View style={styles.backChevron} />
          </Pressable>
          <Image source={logo} resizeMode="contain" style={styles.logo} />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>Hasil Diagnosis</Text>
          <Text style={styles.resultNumber}>No. Hasil: {currentReport.resultNumber}</Text>
        </View>

        <View style={[styles.reportPaper, { width: reportWidth }]}>
          <Image source={logo} resizeMode="contain" style={styles.paperLogo} />
          <Text style={styles.paperBrand}>{APP_NAME}</Text>
          <View style={styles.paperLine} />
          <View style={styles.paperMeta}>
            <Text style={styles.paperSmall}>Nomor : {currentReport.resultNumber}</Text>
            <Text style={styles.paperSmall}>Jakarta, {dateLabel}</Text>
          </View>

          <View style={styles.paperInfo}>
            <Text style={styles.paperText}>Nama Dokter: {doctorName}</Text>
            <Text style={styles.paperText}>No.Telp: {doctorPhone}</Text>
            <Text style={styles.paperText}>Posisi: {doctorPosition}</Text>
            <Text style={styles.paperText}>Homebase: {currentReport.draft.homebaseType.replace('_', ' ')}</Text>
            <Text style={styles.paperText}>Nama Homebase: {currentReport.draft.homebaseName}</Text>
            <Text style={[styles.paperText, styles.addressText]}>Alamat Homebase: {currentReport.draft.homebaseAddress}</Text>
          </View>

          <SegmentedXrayImage
            imageUri={reportImageUri}
            predictions={currentReport.response.data.predictions ?? []}
            imageWidth={currentReport.response.data.imageWidth}
            imageHeight={currentReport.response.data.imageHeight}
          />
          <Text style={styles.imageNumber}>No. {currentReport.resultNumber}</Text>
          <Text style={styles.paperResultTitle}>Hasil :</Text>
          <Text style={styles.paperResult}>{resultLabel}</Text>
          <Text style={styles.resultGuidance}>{RESULT_GUIDANCE}</Text>

          <Text style={styles.noteTitle}>Catatan Diagnosa Dokter:</Text>
          <Text style={styles.note}>{note}</Text>

          <Text style={styles.signatureDate}>Jakarta, {dateLabel}</Text>
          <Text style={styles.signatureName}>dr. {doctorName}</Text>
        </View>

        <LinearGradient
          colors={[appColors.blue, appColors.aquaStrong]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.downloadGradient}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Download PDF"
            disabled={isPreparingPdf}
            onPress={handleDownloadPdf}
            style={({ pressed }) => [
              styles.downloadButton,
              pressed && !isPreparingPdf && styles.pressed,
              isPreparingPdf && styles.downloadDisabled,
            ]}>
            <Text style={styles.downloadText}>
              {isPreparingPdf ? 'Menyiapkan PDF...' : 'Download PDF'}
            </Text>
            <PdfIcon />
          </Pressable>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

function SegmentedXrayImage({
  imageUri,
  predictions,
  imageWidth,
  imageHeight,
}: {
  imageUri: string;
  predictions: DiagnosisPrediction[];
  imageWidth?: number | null;
  imageHeight?: number | null;
}) {
  const displayWidth = 260;
  const displayHeight = 150;
  const sourceWidth = imageWidth || 640;
  const sourceHeight = imageHeight || 640;

  if (!imageUri) {
    return (
      <View style={[styles.segmentedImageWrap, styles.missingImageWrap]}>
        <Text style={styles.missingImageText}>Foto rontgen tidak tersedia</Text>
      </View>
    );
  }

  return (
    <View style={styles.segmentedImageWrap}>
      <Image
        source={{ uri: imageUri }}
        resizeMode="contain"
        style={styles.segmentedImage}
      />

      <Svg 
        width={displayWidth} 
        height={displayHeight} 
        viewBox={`0 0 ${sourceWidth} ${sourceHeight}`}
        style={StyleSheet.absoluteFill}>
        {predictions.map((prediction, index) => {
          const points = prediction.points ?? [];
          if (!points.length) {
            return null;
          }

          const pointString = points.map((point) => `${point.x},${point.y}`).join(' ');

          return (
            <Polygon
              key={prediction.detectionId ?? `${prediction.class}-${index}`}
              points={pointString}
              fill="rgba(139, 92, 246, 0.30)"
              stroke={appColors.blue}
              strokeWidth={2}
            />
          );
        })}
      </Svg>
    </View>
  );
}

function PdfIcon() {
  return (
    <View style={styles.pdfIcon}>
      <View style={styles.pdfFold} />
      <Text style={styles.pdfText}>PDF</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    paddingHorizontal: 32,
    paddingTop: 64,
    paddingBottom: 42,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 4,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    // backgroundColor: appColors.aqua,
    // alignItems: 'center',
    // justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: appColors.blueDeep,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 4,

  },
  backChevron: {
    width: 13,
    height: 13,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: appColors.blue,
    transform: [{ rotate: '45deg' }],
    marginLeft: 4,
  },
  logo: {
    width: 220,
    height: 96,
  },
  titleBlock: {
    alignSelf: 'stretch',
    marginTop: 34,
  },
  title: {
    color: '#000000',
    fontSize: 38,
    fontWeight: '600',
    lineHeight: 46,
  },
  resultNumber: {
    marginTop: 8,
    color: '#111111',
    fontSize: 23,
    fontWeight: '500',
  },
  reportPaper: {
    minHeight: 1300,
    marginTop: 6,
    borderWidth: 2,
    borderColor: '#111111',
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 32,
  },
  paperLogo: {
    alignSelf: 'center',
    width: 92,
    height: 58,
  },
  paperBrand: {
    color: appColors.blueDeep,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  paperLine: {
    height: 2,
    backgroundColor: appColors.blue,
    marginTop: 8,
  },
  paperMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  paperSmall: {
    color: '#111111',
    fontSize: 10,
    fontFamily: 'serif',
  },
  paperInfo: {
    marginTop: 42,
    gap: 4,
  },
  paperText: {
    color: '#111111',
    fontSize: 11,
    fontFamily: 'serif',
  },
  addressText: {
    marginTop: 8,
    maxWidth: '72%',
    lineHeight: 15,
  },
  xrayImage: {
    alignSelf: 'center',
    width: '45%',
    minWidth: 220,
    height: 150,
    marginTop: 40,
    backgroundColor: '#EFE9FF',
  },
  segmentedImageWrap: {
  alignSelf: 'center',
  width: 260,
  height: 150,
  marginTop: 40,
  backgroundColor: '#EFE9FF',
  overflow: 'hidden',
  },
  segmentedImage: {
  width: '100%',
  height: '100%',
  },
  missingImageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingImageText: {
    color: '#5D7E86',
    fontSize: 12,
    fontFamily: 'serif',
    fontWeight: '700',
  },
  imageNumber: {
    marginTop: 8,
    textAlign: 'center',
    color: '#111111',
    fontSize: 11,
    fontFamily: 'serif',
  },
  paperResultTitle: {
    marginTop: 18,
    textAlign: 'center',
    color: '#111111',
    fontSize: 25,
    fontFamily: 'serif',
  },
  paperResult: {
    marginTop: 2,
    textAlign: 'center',
    color: '#111111',
    fontSize: 30,
    fontFamily: 'serif',
    fontWeight: '800',
  },
  resultGuidance: {
    marginTop: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: appColors.aquaStrong,
    backgroundColor: appColors.aquaLight,
    color: '#312A3F',
    fontSize: 11,
    fontFamily: 'serif',
    lineHeight: 17,
  },
  noteTitle: {
    marginTop: 34,
    color: '#111111',
    fontSize: 12,
    fontFamily: 'serif',
    fontWeight: '800',
  },
  note: {
    marginTop: 18,
    color: '#111111',
    fontSize: 11,
    fontFamily: 'serif',
    lineHeight: 15,
  },
  signatureDate: {
    marginTop: 56,
    textAlign: 'right',
    color: '#111111',
    fontSize: 12,
    fontFamily: 'serif',
    fontWeight: '800',
  },
  signatureName: {
    marginTop: 88,
    textAlign: 'right',
    color: '#111111',
    fontSize: 11,
    fontFamily: 'serif',
  },
  downloadGradient: {
    width: '100%',
    height: 68,
    borderRadius: 12,
    marginTop: 38,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  downloadButton: {
    flex: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  downloadDisabled: {
    opacity: 0.65,
  },
  downloadText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  pdfIcon: {
    width: 31,
    height: 38,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 3,
  },
  pdfFold: {
    position: 'absolute',
    right: -3,
    top: -3,
    width: 13,
    height: 13,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  pdfText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 24,
  },
  emptyTitle: {
    color: '#111111',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
});





