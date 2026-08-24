import {
  WARD_LETTER_TYPES,
  type LetterType,
  wardIssueTypeFromLetterType,
} from '@/lib/letters/templates';
import {
  wardIssueParagraphsHtml,
  wardIssueSubjectHtml,
} from '@/lib/letters/ward-issue-presets';

/** Shared layout CSS from the fees concession Marathi letter. */
const LETTER_STYLE = `
    .var { font-weight: bold; }
    .top-row { display: flex; margin-bottom: 12px; justify-content: space-between; }
    .address { margin-left: 28px; margin-bottom: 12px; font-weight: normal; max-width: 100%; white-space: normal; overflow-wrap: anywhere; word-break: normal; }
    .recipient { margin-left: 28px; margin-bottom: 12px; font-weight: normal; max-width: 100%; white-space: normal; overflow-wrap: anywhere; word-break: normal; }
    .subject { display: flex; align-items: flex-start; gap: 6px; margin-bottom: 12px; }
    .subject-label { flex: 0 0 auto; white-space: nowrap; font-weight: normal; }
    .subject-text { flex: 1; text-align: left; font-weight: bold; }
    .salutation { font-weight: normal; }
    .paragraph { text-align: justify; text-indent: 28px; padding: 0; font-weight: normal; }
    .paragraph:last-of-type { margin-bottom: 0; }
    .member-list { text-align: left; text-indent: 0; padding: 0; font-weight: normal; }
    .right-tab { text-align: right; padding-right: 36px; font-weight: normal; }
    .right-tab-sign { text-align: right; padding-right: 28px; margin-top: 30px; font-weight: bold; }
    .letter-closing { text-align: right; }
    .letter-closing .signature-line { text-align: right; }
    .recipient-bottom { margin-top: 25px; font-weight: normal; max-width: 100%; white-space: normal; overflow-wrap: anywhere; word-break: normal; }
    .letter-title { text-align: center; font-weight: bold; font-size: 16px; margin: 16px 0 20px; text-decoration: underline; }
`;

const ROOT =
  'white-space: normal; font-family: inherit; font-size: 14px; line-height: 1.55; color: #000; margin: 0; font-weight: normal;';

const CLOSING = `<div class="right-tab">
    आपली विश्वासू,
  </div>
  <div class="right-tab-sign">
    (<span class="var">{{signatory}}</span>)
  </div>`;

function subjectHtml(body: string): string {
  return `<div class="subject"><span class="subject-label">विषय:</span><span class="subject-text">${body}</span></div>`;
}

const WARD_TEMPLATE_HTML = `<div class="letter-content" style="${ROOT}">
  <style>${LETTER_STYLE}</style>
  <div class="top-row">
    <div>संदर्भ क्र. <span class="var">{{referencePrefix}}</span>/<span class="var">{{referenceNo}}</span></div>
    <div>दि. <span class="var">{{date}}</span></div>
  </div>
प्रति,<br>
  <div class="address">{{toBlock}}</div>
  ${subjectHtml('<span class="var">{{subject}}</span>')}
  <div class="salutation">
    महोदय,
  </div>
  {{paragraphsBlock}}
  ${CLOSING}
</div>`;

function wardIssueTemplateHtml(
  letterType: (typeof WARD_LETTER_TYPES)[number],
): string {
  const issueType = wardIssueTypeFromLetterType(letterType);
  if (!issueType) return WARD_TEMPLATE_HTML;
  return `<div class="letter-content" style="${ROOT}">
  <style>${LETTER_STYLE}</style>
  <div class="top-row">
    <div>संदर्भ क्र. <span class="var">{{referencePrefix}}</span>/<span class="var">{{referenceNo}}</span></div>
    <div>दि. <span class="var">{{date}}</span></div>
  </div>
प्रति,<br>
  <div class="address">{{toBlock}}</div>
  ${subjectHtml(wardIssueSubjectHtml(issueType, 'mr'))}
  <div class="salutation">
    महोदय,
  </div>
  ${wardIssueParagraphsHtml(issueType, 'mr')}
  ${CLOSING}
</div>`;
}

export const MR_TEMPLATE_HTML: Record<LetterType, string> = {
  general: `<div class="letter-content" style="${ROOT}">
  <style>${LETTER_STYLE}</style>
  <div class="top-row">
    <div>संदर्भ क्र. <span class="var">{{referencePrefix}}</span>/<span class="var">{{referenceNo}}</span></div>
    <div>दि. <span class="var">{{date}}</span></div>
  </div>
  <div class="recipient">{{toBlock}}</div>
  ${subjectHtml('<span class="var">{{subject}}</span>')}
  <div class="salutation">
    महोदय/महोदया,
  </div>
  {{paragraphsBlock}}
  ${CLOSING}
</div>`,

  fees: `<div class="letter-content" style="${ROOT}">
  <style>${LETTER_STYLE}</style>
  <div class="top-row">
    <div>संदर्भ क्र. <span class="var">{{referencePrefix}}</span>/<span class="var">{{referenceNo}}</span></div>
    <div>दि. <span class="var">{{date}}</span></div>
  </div>
प्रति,<br>
  <div class="address">
    मुख्याध्यापक / प्राचार्य,<br>
    <span class="var" style="font-weight: bold;">{{schoolName}}</span>,<br>
    <span style="font-weight: normal;">{{schoolAddress}}</span>
  </div>
  ${subjectHtml('<span class="var">{{standard}}</span> मधील <span class="var">{{studentName}}</span> या विद्यार्थ्यास शुल्क सवलतीसाठी विनंती')}
  <div class="salutation">
    महोदय/महोदया,
  </div>
  <p class="paragraph">
    सदर पत्राद्वारे आपणास विनंती करण्यात येत आहे की, आपल्या शाळेत <span class="var">{{standard}}</span> मध्ये शिकत असलेल्या <span class="var">{{studentName}}</span> या विद्यार्थ्यास शुल्क सवलत मंजूर करावी.
  </p>
  <p class="paragraph">
    सदर विद्यार्थ्याच्या पालकांची आर्थिक परिस्थिती अत्यंत हलाखीची असून, सध्या संपूर्ण शुल्क भरणे त्यांना शक्य नाही. म्हणून, आपण कृपया सहानुभूतीपूर्वक विचार करून संपूर्ण किंवा अंशतः शुल्क सवलत द्यावी, तसेच शुल्क भरण्यासाठी थोडा अधिक कालावधी आणि/किंवा हप्त्यांमध्ये भरण्याची सुविधा उपलब्ध करून द्यावी, ही नम्र विनंती आहे.
  </p>
  <p class="paragraph">
    तसेच, कृपया सदर विद्यार्थ्यास नियमित शाळेत/कॉलेजमध्ये हजर राहण्याची परवानगी द्यावी, जेणेकरून सदर विद्यार्थ्याच्या शिक्षणावर कोणताही परिणाम होणार नाही.
  </p>
  <p class="paragraph">
    आपण या प्रकरणाचा सहानुभूतीपूर्वक विचार करून सकारात्मक निर्णय घ्याल, अशी अपेक्षा आहे.
  </p>
  ${CLOSING}
</div>`,

  'school-admission': `<div class="letter-content" style="${ROOT}">
  <style>${LETTER_STYLE}</style>
  <div class="top-row">
    <div>संदर्भ क्र. <span class="var">{{referencePrefix}}</span>/<span class="var">{{referenceNo}}</span></div>
    <div>दि. <span class="var">{{date}}</span></div>
  </div>
प्रति,<br>
  <div class="address">
    मुख्याध्यापक / प्राचार्य,<br>
    <span class="var" style="font-weight: bold;">{{schoolName}}</span>,<br>
    <span style="font-weight: normal;">{{schoolAddress}}</span>
  </div>
  ${subjectHtml('<span class="var">{{studentName}}</span> या विद्यार्थ्यास इयत्ता <span class="var">{{standard}}</span> मध्ये प्रवेश मिळण्याबाबत शिफारस.')}
  <div class="salutation">
    महोदय/महोदया,
  </div>
  <p class="paragraph">
    सदर पत्राद्वारे आपणास विनंती करण्यात येत आहे की, <span class="var">{{parentName}}</span>, रा. <span style="font-weight: normal;">{{address}}</span> यांचे पाल्य <span class="var">{{studentName}}</span> यास आपल्या शाळेत इयत्ता <span class="var">{{standard}}</span> मध्ये प्रवेश मिळण्याकरिता आपणाकडे शिफारस करण्यात येत आहे.
  </p>
  <p class="paragraph">
    सदर विद्यार्थ्यास शिक्षणाची आवड असून, पुढील शिक्षणासाठी योग्य शैक्षणिक वातावरण मिळणे आवश्यक आहे. आपल्या शाळेत इयत्ता <span class="var">{{standard}}</span> मध्ये प्रवेश मिळाल्यास सदर विद्यार्थ्याच्या शिक्षणास निश्चितच मदत होईल.
  </p>
  <p class="paragraph">
    <span class="var">{{reasonText}}</span>
  </p>
  <p class="paragraph">
    तरी उपलब्ध जागा, प्रवेश नियम व आवश्यक कागदपत्रांची पडताळणी करून सदर विद्यार्थ्यास आपल्या शाळेत इयत्ता <span class="var">{{standard}}</span> मध्ये प्रवेश देण्याबाबत सहानुभूतीपूर्वक व नियमानुसार आवश्यक ती कार्यवाही करण्यात यावी, ही विनंती.
  </p>
  ${CLOSING}
</div>`,

  'college-admission': `<div class="letter-content" style="${ROOT}">
  <style>${LETTER_STYLE}</style>
  <div class="top-row">
    <div>संदर्भ क्र. <span class="var">{{referencePrefix}}</span>/<span class="var">{{referenceNo}}</span></div>
    <div>दि. <span class="var">{{date}}</span></div>
  </div>
प्रति,<br>
  <div class="address">
    प्राचार्य,<br>
    <span class="var" style="font-weight: bold;">{{collegeName}}</span>,<br>
    <span style="font-weight: normal;">{{collegeAddress}}</span>
  </div>
  ${subjectHtml('<span class="var">{{studentName}}</span> या विद्यार्थ्यास <span class="var">{{courseName}}</span> अभ्यासक्रमात प्रवेश मिळण्याबाबत शिफारस.')}
  <div class="salutation">
    महोदय,
  </div>
  <p class="paragraph">
    सदर पत्राद्वारे आपणास विनंती करण्यात येत आहे की, <span class="var">{{parentName}}</span>, रा. <span style="font-weight: normal;">{{address}}</span> यांचे पाल्य <span class="var">{{studentName}}</span> यास आपल्या महाविद्यालयात <span class="var">{{courseName}}</span> अभ्यासक्रमात प्रवेश मिळण्याकरिता आपणाकडे शिफारस करण्यात येत आहे.
  </p>
  <p class="paragraph">
    सदर विद्यार्थ्यास उच्च शिक्षणाची आवड असून, पुढील शैक्षणिक प्रगतीसाठी योग्य व दर्जेदार शैक्षणिक वातावरण मिळणे आवश्यक आहे. आपल्या महाविद्यालयात <span class="var">{{courseName}}</span> अभ्यासक्रमात प्रवेश मिळाल्यास सदर विद्यार्थ्याच्या पुढील शिक्षणास व शैक्षणिक प्रगतीस निश्चितच मदत होईल.
  </p>
  <p class="paragraph">
    <span class="var">{{reasonText}}</span>
  </p>
  <p class="paragraph">
    तरी उपलब्ध जागा, प्रवेशासंबंधी प्रचलित नियम, पात्रता निकष व आवश्यक कागदपत्रांची पडताळणी करून सदर विद्यार्थ्यास आपल्या महाविद्यालयात <span class="var">{{courseName}}</span> अभ्यासक्रमात प्रवेश देण्याबाबत सहानुभूतीपूर्वक व नियमानुसार आवश्यक ती कार्यवाही करण्यात यावी, ही विनंती.
  </p>
  ${CLOSING}
</div>`,

  'school-transfer': `<div class="letter-content" style="${ROOT}">
  <style>${LETTER_STYLE}</style>
  <div class="top-row">
    <div>संदर्भ क्र. <span class="var">{{referencePrefix}}</span>/<span class="var">{{referenceNo}}</span></div>
    <div>दि. <span class="var">{{date}}</span></div>
  </div>
प्रति,<br>
  <div class="address">
    मुख्याध्यापक / प्राचार्य,<br>
    <span class="var" style="font-weight: bold;">{{schoolName}}</span>,<br>
    <span style="font-weight: normal;">{{schoolAddress}}</span>
  </div>
  ${subjectHtml('<span class="var">{{studentName}}</span> या विद्यार्थ्यास इयत्ता <span class="var">{{standard}}</span> मध्ये स्थानांतरणाद्वारे प्रवेश मिळण्याबाबत शिफारस.')}
  <div class="salutation">
    महोदय/महोदया,
  </div>
  <p class="paragraph">
    सदर पत्राद्वारे आपणास विनंती करण्यात येत आहे की, <span class="var">{{parentName}}</span>, रा. <span style="font-weight: normal;">{{address}}</span> यांचे पाल्य <span class="var">{{studentName}}</span> यास आपल्या शाळेत इयत्ता <span class="var">{{standard}}</span> मध्ये स्थानांतरणाद्वारे प्रवेश मिळण्याकरिता आपणाकडे शिफारस करण्यात येत आहे.
  </p>
  <p class="paragraph">
    सदर विद्यार्थी सध्या <span class="var">{{previousSchoolName}}</span> येथे इयत्ता <span class="var">{{currentStandard}}</span> मध्ये शिक्षण घेत असून, <span class="var">{{transferReason}}</span> या कारणास्तव आपल्या शाळेत इयत्ता <span class="var">{{standard}}</span> मध्ये प्रवेश घेणे आवश्यक झाले आहे.
  </p>
  <p class="paragraph">
    सदर विद्यार्थ्याच्या शिक्षणात खंड पडू नये व त्याचे पुढील शिक्षण सुरळीतपणे सुरू राहावे, याकरिता आपल्या शाळेत इयत्ता <span class="var">{{standard}}</span> मध्ये प्रवेश मिळणे अत्यंत आवश्यक आहे.
  </p>
  <p class="paragraph">
    तरी उपलब्ध जागा, प्रवेश नियम, शाळा सोडल्याचा दाखला / ट्रान्सफर सर्टिफिकेट आणि आवश्यक कागदपत्रांची पडताळणी करून सदर विद्यार्थ्यास आपल्या शाळेत इयत्ता <span class="var">{{standard}}</span> मध्ये स्थानांतरणाद्वारे प्रवेश देण्याबाबत सहानुभूतीपूर्वक व नियमानुसार आवश्यक ती कार्यवाही करण्यात यावी, ही विनंती.
  </p>
  ${CLOSING}
</div>`,

  'ration-new': `<div class="letter-content" style="${ROOT}">
  <style>${LETTER_STYLE}</style>
  <div class="top-row">
    <div>संदर्भ क्र. <span class="var">{{referencePrefix}}</span>/<span class="var">{{referenceNo}}</span></div>
    <div>दि. <span class="var">{{date}}</span></div>
  </div>
  ${subjectHtml('नवीन शिधापत्रिका मिळण्याबाबत.')}
  <p class="paragraph">
    सदर पत्रासोबत अर्जदार <span class="var">{{salutation}}</span> <span class="var">{{fullName}}</span>, रा. <span style="font-weight: normal;">{{address}}</span> यांना नवीन शिधापत्रिका मिळण्याकरिता आपणाकडे पाठवीत आहोत.
  </p>
  <p class="paragraph">
    अर्जदाराने नवीन शिधापत्रिका मिळण्यासाठी आवश्यक कागदपत्रांसह अर्ज सादर केला असून, खालील कुटुंबीयांची नावे सदर नवीन शिधापत्रिकेत समाविष्ट करण्याबाबत विनंती करण्यात येत आहे:
  </p>
  <p class="member-list">
    <span class="var">{{familyMembersBlock}}</span>
  </p>
  <p class="paragraph">
    तरी अर्जदाराकडे असलेल्या पुरावादर्शक कागदपत्रांची पडताळणी करून नवीन शिधापत्रिका मंजूर करण्याबाबत नियमानुसार आवश्यक ती कार्यवाही करण्यात यावी, ही विनंती.
  </p>
  ${CLOSING}
  <div class="recipient-bottom">
    प्रति,<br>
    शिधावाटप अधिकारी,<br>
    <span style="font-weight: normal;">{{rationOfficeAddress}}</span>
  </div>
</div>`,

  'ration-add-members': `<div class="letter-content" style="${ROOT}">
  <style>${LETTER_STYLE}</style>
  <div class="top-row">
    <div>संदर्भ क्र. <span class="var">{{referencePrefix}}</span>/<span class="var">{{referenceNo}}</span></div>
    <div>दि. <span class="var">{{date}}</span></div>
  </div>
  ${subjectHtml('शिधापत्रिकेत नाव समाविष्ट करण्याबाबत.')}
  <p class="paragraph">
    सदर पत्रासोबत अर्जदार <span class="var">{{salutation}}</span> <span class="var">{{fullName}}</span>, रा. <span style="font-weight: normal;">{{address}}</span> यांना त्यांच्या शिधापत्रिकेत कुटुंबातील सदस्यांची नावे समाविष्ट करण्याकरिता आपणाकडे पाठवीत आहोत.
  </p>
  <p class="paragraph">
    अर्जदाराकडील शिधापत्रिका क्रमांक <span class="var">{{rationCardNo}}</span> असून, त्यांनी खालील सदस्यांची नावे सदर शिधापत्रिकेत समाविष्ट करण्याबाबत विनंती करण्यात येत आहे:
  </p>
  <p class="member-list">
    <span class="var">{{familyMembersBlock}}</span>
  </p>
  <p class="paragraph">
    तरी अर्जदाराकडे असलेल्या पुरावादर्शक कागदपत्रांची पडताळणी करून सदर सदस्यांची नावे शिधापत्रिकेत समाविष्ट करण्याबाबत नियमानुसार आवश्यक ती कार्यवाही करण्यात यावी, ही विनंती.
  </p>
  ${CLOSING}
  <div class="recipient-bottom">
    प्रति,<br>
    शिधावाटप अधिकारी,<br>
    <span style="font-weight: normal;">{{rationOfficeAddress}}</span>
  </div>
</div>`,

  'ration-delete-members': `<div class="letter-content" style="${ROOT}">
  <style>${LETTER_STYLE}</style>
  <div class="top-row">
    <div>संदर्भ क्र. <span class="var">{{referencePrefix}}</span>/<span class="var">{{referenceNo}}</span></div>
    <div>दि. <span class="var">{{date}}</span></div>
  </div>
  ${subjectHtml('शिधापत्रिकेतून नाव वगळण्याबाबत.')}
  <p class="paragraph">
    सदर पत्रासोबत अर्जदार <span class="var">{{salutation}}</span> <span class="var">{{fullName}}</span>, रा. <span style="font-weight: normal;">{{address}}</span> यांना त्यांच्या शिधापत्रिकेतून कुटुंबातील सदस्यांची नावे वगळण्याकरिता आपणाकडे पाठवीत आहोत.
  </p>
  <p class="paragraph">
    अर्जदाराकडील शिधापत्रिका क्रमांक <span class="var">{{rationCardNo}}</span> असून, त्यांनी खालील सदस्यांची नावे सदर शिधापत्रिकेतून वगळण्याबाबत विनंती करण्यात येत आहे:
  </p>
  <p class="member-list">
    <span class="var">{{familyMembersBlock}}</span>
  </p>
  <p class="paragraph">
    तरी अर्जदाराकडे असलेल्या पुरावादर्शक कागदपत्रांची पडताळणी करून सदर सदस्यांची नावे शिधापत्रिकेतून वगळण्याबाबत नियमानुसार आवश्यक ती कार्यवाही करण्यात यावी, ही विनंती.
  </p>
  ${CLOSING}
  <div class="recipient-bottom">
    प्रति,<br>
    शिधावाटप अधिकारी,<br>
    <span style="font-weight: normal;">{{rationOfficeAddress}}</span>
  </div>
</div>`,

  'ration-transfer': `<div class="letter-content" style="${ROOT}">
  <style>${LETTER_STYLE}</style>
  <div class="top-row">
    <div>संदर्भ क्र. <span class="var">{{referencePrefix}}</span>/<span class="var">{{referenceNo}}</span></div>
    <div>दि. <span class="var">{{date}}</span></div>
  </div>
  ${subjectHtml('शिधापत्रिका एका शिधावाटप कार्यालयातून दुसऱ्या शिधावाटप कार्यालयात हस्तांतरित करण्याबाबत.')}
  <p class="paragraph">
    सदर पत्रासोबत अर्जदार <span class="var">{{salutation}}</span> <span class="var">{{fullName}}</span>, रा. <span style="font-weight: normal;">{{address}}</span> यांना त्यांच्या शिधापत्रिकेचे हस्तांतरण करण्याकरिता आपणाकडे पाठवीत आहोत.
  </p>
  <p class="paragraph">
    अर्जदाराकडील शिधापत्रिका क्रमांक <span class="var">{{rationCardNo}}</span> असून, सदर शिधापत्रिका <span class="var">{{fromRationOffice}}</span> येथून <span class="var">{{toRationOffice}}</span> येथे हस्तांतरित करण्याबाबत विनंती करण्यात येत आहे.
  </p>
  <p class="paragraph">
    अर्जदाराच्या निवासस्थानात बदल झाल्यामुळे / क्षेत्रात बदल झाल्यामुळे सदर शिधापत्रिका संबंधित नवीन शिधावाटप कार्यालयाच्या कार्यक्षेत्रात वर्ग करणे आवश्यक आहे.
  </p>
  <p class="member-list">
    <span class="var">{{familyMembersBlock}}</span>
  </p>
  <p class="paragraph">
    तरी अर्जदाराकडे असलेल्या पुरावादर्शक कागदपत्रांची पडताळणी करून सदर शिधापत्रिका <span class="var">{{toRationOffice}}</span> येथे हस्तांतरित करण्याबाबत नियमानुसार आवश्यक ती कार्यवाही करण्यात यावी, ही विनंती.
  </p>
  ${CLOSING}
  <div class="recipient-bottom">
    प्रति,<br>
    शिधावाटप अधिकारी,<br>
    <span style="font-weight: normal;">{{rationOfficeAddress}}</span>
  </div>
</div>`,

  income: `<div class="letter-content" style="${ROOT}">
  <style>${LETTER_STYLE}</style>
  <div class="top-row">
    <div>संदर्भ क्र. <span class="var">{{referencePrefix}}</span>/<span class="var">{{referenceNo}}</span></div>
    <div>दि. <span class="var">{{date}}</span></div>
  </div>
प्रति,<br>
  <div class="address">
    संबंधित अधिकारी,<br>
    <span class="var" style="font-weight: bold;">{{officeName}}</span>,<br>
    <span style="font-weight: normal;">{{officeAddress}}</span>
  </div>
  ${subjectHtml('<span class="var">{{fullName}}</span> यांना उत्पन्न प्रमाणपत्र मिळण्याबाबत.')}
  <div class="salutation">
    महोदय/महोदया,
  </div>
  <p class="paragraph">
    सदर पत्राद्वारे आपणास कळविण्यात येते की, <span class="var">{{salutation}}</span> <span class="var">{{fullName}}</span>, रा. <span style="font-weight: normal;">{{address}}</span> <span class="var">{{genderPronounSubject}}</span> वरील पत्त्यावर वास्तव्यास आहेत.
  </p>
  <p class="paragraph">
    सदर अर्जदारांचा आधार क्रमांक <span class="var">{{aadhaarNo}}</span> असा असून, त्यांनी दिलेल्या माहितीनुसार त्यांचे वार्षिक उत्पन्न रु. <span class="var">{{annualIncome}}</span>/- इतके आहे.
  </p>
  <p class="paragraph">
    सदर प्रमाणपत्र / शिफारसपत्र अर्जदाराच्या विनंतीनुसार देण्यात येत आहे.
  </p>
  <p class="paragraph">
    तरी सदर अर्जदाराकडे असलेल्या पुरावादर्शक कागदपत्रांची पडताळणी करून त्यांना उत्पन्न प्रमाणपत्र देण्याबाबत नियमानुसार आवश्यक ती कार्यवाही करण्यात यावी, ही विनंती.
  </p>
  ${CLOSING}
</div>`,

  domicile: `<div class="letter-content" style="${ROOT}">
  <style>${LETTER_STYLE}</style>
  <div class="top-row">
    <div>संदर्भ क्र. <span class="var">{{referencePrefix}}</span>/<span class="var">{{referenceNo}}</span></div>
    <div>दि. <span class="var">{{date}}</span></div>
  </div>
प्रति,<br>
  <div class="address">
    संबंधित अधिकारी,<br>
    <span class="var" style="font-weight: bold;">{{officeName}}</span>,<br>
    <span style="font-weight: normal;">{{officeAddress}}</span>
  </div>
  ${subjectHtml('<span class="var">{{fullName}}</span> यांना अधिवास / रहिवासी प्रमाणपत्र मिळण्याबाबत.')}
  <div class="salutation">
    महोदय/महोदया,
  </div>
  <p class="paragraph">
    सदर पत्राद्वारे आपणास कळविण्यात येते की, <span class="var">{{salutation}}</span> <span class="var">{{fullName}}</span>, रा. <span style="font-weight: normal;">{{address}}</span> <span class="var">{{genderPronounSubject}}</span> वरील पत्त्यावर दीर्घ काळापासून वास्तव्यास आहेत.
  </p>
  <p class="paragraph">
    सदर अर्जदारांचा आधार क्रमांक <span class="var">{{aadhaarNo}}</span> असा असून, त्यांनी अधिवास / रहिवासी प्रमाणपत्र मिळण्याकरिता विनंती केली आहे.
  </p>
  <p class="paragraph">
    तरी सदर अर्जदाराकडे असलेल्या पुरावादर्शक कागदपत्रांची पडताळणी करून अधिवास / रहिवासी प्रमाणपत्र देण्याबाबत नियमानुसार आवश्यक ती कार्यवाही करण्यात यावी, ही विनंती.
  </p>
  ${CLOSING}
</div>`,

  identity: `<div class="letter-content" style="${ROOT}">
  <style>${LETTER_STYLE}</style>
  <div class="top-row">
    <div>संदर्भ क्र. <span class="var">{{referencePrefix}}</span>/<span class="var">{{referenceNo}}</span></div>
    <div>दि. <span class="var">{{date}}</span></div>
  </div>
  <div class="letter-title">ओळखपत्र</div>
  <p class="paragraph">
    <span class="var">{{salutation}}</span> <span class="var">{{fullName}}</span> रा. <span style="font-weight: normal;">{{address}}</span>. <span class="var">{{genderPronounSubject}}</span> रहिवासी पत्त्यावर अनेक दिवसांपासून वास्तव्य करीत असून यांचा आधार क्र. <span class="var">{{aadhaarNo}}</span> आहे, छायांकित प्रत जोडली आहे.
  </p>
  <p class="paragraph">
    सदरचे ओळखपत्र त्यांना त्यांच्या विनंतीनुसार <span class="var">{{reason}}</span> देण्यात येत आहे.
  </p>
  ${CLOSING}
</div>`,

  'medical-assistance': `<div class="letter-content" style="${ROOT}">
  <style>${LETTER_STYLE}</style>
  <div class="top-row">
    <div>संदर्भ क्र. <span class="var">{{referencePrefix}}</span>/<span class="var">{{referenceNo}}</span></div>
    <div>दि. <span class="var">{{date}}</span></div>
  </div>
  <div>प्रति,</div>
  <div class="recipient">
    वैद्यकीय अधीक्षक / अधिष्ठाता,<br>
    <span class="var">{{hospitalName}}</span>,<br>
    {{hospitalAddress}}
  </div>
  ${subjectHtml('{{fullName}} यांच्या वैद्यकीय उपचाराचा खर्च गरीब सहायता निधीतून करण्याबाबत.')}
  <div class="salutation">
    महोदय/महोदया,
  </div>
  <p class="paragraph">
    <span class="var">{{salutation}} {{fullName}}</span>, वय वर्षे <span class="var">{{age}}</span>, रा. {{address}}, यांना वैद्यकीय उपचारासाठी आपणाकडे पाठवीत आहे. त्यांना <span class="var">{{ailment}}</span> हा आजार असून तातडीने <span class="var">{{treatment}}</span> करण्याची आवश्यकता आहे. सध्या <span class="var">{{salutation}} {{fullName}}</span> यांच्यावर आपल्या रुग्णालयात उपचार सुरू आहेत.
  </p>
  <p class="paragraph">
    त्यांची आर्थिक परिस्थिती अत्यंत हलाखीची असून सदर वैद्यकीय उपचारांचा खर्च करणे त्यांना शक्य नाही.
  </p>
  <p class="paragraph">
    तरी, कृपया त्यांच्या वैद्यकीय उपचाराचा खर्च गरीब सहायता निधीतून करण्यात यावा, ही विनंती.
  </p>
  ${CLOSING}
</div>`,

  ward: WARD_TEMPLATE_HTML,
  ...Object.fromEntries(
    WARD_LETTER_TYPES.map((type) => [type, wardIssueTemplateHtml(type)]),
  ),
} as Record<LetterType, string>;
