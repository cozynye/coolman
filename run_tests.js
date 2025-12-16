const axios = require('axios');

const keywords = [
    '맥북',
    '아이폰',
    'lg 그램',
    '갤럭시',
    '에어팟',
    '아이패드',
    '닌텐도',
    '플스5',
    '캐논',
    '소니'
];

async function testSearch(keyword) {
    try {
        const response = await axios.post('http://localhost:3010/api/search', {
            keyword
        });

        const data = response.data;
        const bunjangCount = data.results.filter(r => r.platform === '번개장터').length;
        const joonggoCount = data.results.filter(r => r.platform === '중고나라').length;

        console.log(`\n${'='.repeat(60)}`);
        console.log(`검색어: ${keyword}`);
        console.log(`${'='.repeat(60)}`);
        console.log(`번개장터 결과: ${bunjangCount}개`);
        console.log(`중고나라 결과: ${joonggoCount}개`);
        console.log(`총 결과: ${data.results.length}개`);
        console.log(`\n대표 결과 (최신순 상위 5개):`);

        data.results.slice(0, 5).forEach((item, idx) => {
            console.log(`  ${idx + 1}. [${item.platform}] ${item.title.substring(0, 50)}...`);
            console.log(`     가격: ${item.price} | 등록: ${item.update_time} | 상태: ${item.status}`);
        });

        return {
            keyword,
            bunjangCount,
            joonggoCount,
            totalCount: data.results.length,
            success: true
        };
    } catch (error) {
        console.error(`\n❌ 검색 실패: ${keyword}`);
        console.error(`   에러: ${error.message}`);
        return {
            keyword,
            bunjangCount: 0,
            joonggoCount: 0,
            totalCount: 0,
            success: false,
            error: error.message
        };
    }
}

async function runAllTests() {
    console.log('통합 검색 서비스 테스트 시작...\n');

    const results = [];

    for (const keyword of keywords) {
        const result = await testSearch(keyword);
        results.push(result);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('테스트 요약');
    console.log(`${'='.repeat(60)}`);

    const successCount = results.filter(r => r.success).length;
    console.log(`성공: ${successCount}/${keywords.length}`);
    console.log(`\n검색어별 결과:`);

    results.forEach(r => {
        if (r.success) {
            console.log(`  ✅ ${r.keyword}: 번개장터 ${r.bunjangCount}개 + 중고나라 ${r.joonggoCount}개 = 총 ${r.totalCount}개`);
        } else {
            console.log(`  ❌ ${r.keyword}: 실패 (${r.error})`);
        }
    });

    const allSuccess = successCount === keywords.length;
    const totalBunjang = results.reduce((sum, r) => sum + r.bunjangCount, 0);
    const totalJoonggo = results.reduce((sum, r) => sum + r.joonggoCount, 0);

    console.log(`\n전체 통계:`);
    console.log(`  총 번개장터 결과: ${totalBunjang}개`);
    console.log(`  총 중고나라 결과: ${totalJoonggo}개`);
    console.log(`  총 검색 결과: ${totalBunjang + totalJoonggo}개`);

    if (allSuccess && totalBunjang > 0 && totalJoonggo > 0) {
        console.log(`\n✅ 모든 테스트 통과! 커밋 준비 완료.`);
    } else {
        console.log(`\n⚠️  일부 테스트 실패 또는 결과 부족. 확인 필요.`);
    }
}

runAllTests().catch(console.error);
