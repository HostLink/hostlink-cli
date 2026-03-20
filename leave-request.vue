<script setup>
// 頁面標題
useHead({
    title: '申請放假 - Hostlink'
})

const $q = useQuasar()


// 請假類型選項
const LEAVE_TYPES = [
    { label: '年假', value: 0 },
    { label: '病假', value: 1 },
    { label: '時薪年假', value: 3 },
    { label: '無薪假', value: 4 },
]

// 上午/下午選項
const AMPM_OPTIONS = [
    { label: '上午', value: 0 },
    { label: '下午', value: 1 },
]

// 表單提交狀態
const isSubmitting = ref(false)
const submitSuccess = ref(false)


// 載入員工資訊以顯示剩餘假期
const { data: staffInfo } = await useAsyncData('staff-info', async () => {
    const data = await q({
        myStaff: {
            staff_id: true,
            staff_first_name: true,
            staff_last_name: true,
            total_leave_day_available: true,
            total_leave_hour_available: true,
            total_compensatory_leave: true,
        }
    })
    return data.myStaff
})

// 表單提交處理
const handleSubmit = async (formData) => {
    if (isSubmitting.value) return

    try {
        isSubmitting.value = true

        // 準備提交數據
        const submitData = {
            type: formData.type,
            from_date: formData.from_date,
            remark: formData.remark || '',
        }

        // 根據假期類型添加相應欄位
        if (formData.type === 0 || formData.type === 1 || formData.type === 4) {
            // 年假、病假、無薪假 - 使用日期和上下午
            submitData.from_time = formData.from_time
            submitData.to_date = formData.to_date
            submitData.to_time = formData.to_time
        } else if (formData.type === 3) {
            // 時薪年假 - 使用時間和小時數
            submitData.start_time = formData.start_time
            submitData.hour = formData.hour
        }

        // 提交請假申請
        const result = await m("addStaffLeaveRequest", {
            data: submitData
        })


        submitSuccess.value = true

        // 顯示成功消息
        $q.notify({
            type: 'positive',
            message: '請假申請已提交成功！',
            position: 'top'
        })

        // 延遲後導航回主頁
        setTimeout(() => {
            navigateTo('/my/portal')
        }, 2000)

    } catch (error) {
        console.error('提交請假申請失敗:', error)
        $q.notify({
            type: 'negative',
            message: '提交失敗，請稍後再試',
            position: 'top'
        })
    } finally {
        isSubmitting.value = false
    }
}

// 計算請假天數
const calculateLeaveDays = (fromDate, toDate, fromTime, toTime) => {
    if (!fromDate || !toDate) return 0

    const start = new Date(fromDate)
    const end = new Date(toDate)
    const diffTime = Math.abs(end - start)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // 如果是同一天
    if (diffDays === 0) {
        if (fromTime === toTime) return 0.5 // 半天
        return 1 // 全天
    }

    // 多天假期計算
    let totalDays = diffDays + 1;
    if (fromTime === 1) totalDays -= 0.5 // 第一天下午開始
    if (toTime === 0) totalDays -= 0.5 // 最後一天上午結束

    return Math.max(totalDays, 0)
}
</script>

<template>
    <q-page padding>
        <q-toolbar>
            <div class="row items-center q-gutter-md">
                <l-btn flat round icon="arrow_back" @click="$router.back()" />
                <div>
                    <div class="text-h6">申請放假</div>
                    <div class="text-caption text-grey-6">
                        {{ staffInfo?.staff_first_name }} {{ staffInfo?.staff_last_name }}
                    </div>
                </div>
            </div>
        </q-toolbar>

        <div class="row justify-center">
            <div class="col-12 col-md-8 col-lg-6">
                <!-- 剩餘假期資訊 -->
                <q-card class="q-mb-lg">
                    <q-card-section>
                        <div class="text-h6 q-mb-md">剩餘假期</div>
                        <div class="row q-gutter-md">
                            <div class="col">
                                <div class="text-center">
                                    <div class="text-h4 text-blue">{{ staffInfo?.total_leave_day_available || 0 }}</div>
                                    <div class="text-caption">年假(天)</div>
                                </div>
                            </div>
                            <div class="col">
                                <div class="text-center">
                                    <div class="text-h4 text-orange">{{ staffInfo?.total_leave_hour_available || 0 }}
                                    </div>
                                    <div class="text-caption">可用OT補假時數(小時)
                                        <br/>
                                        (如要使用,先將OT補假時<nuxt-link href="/my/convert-ot">數轉換為年假</nuxt-link>)
                                    </div>
                                </div>
                            </div>
                          
                        </div>
                    </q-card-section>
                </q-card>

                <!-- 請假申請表單 -->
                <q-card v-if="!submitSuccess">
                    <q-card-section>
                        <div class="text-h6 q-mb-md">請假申請表</div>

                        <form-kit type="l-form" submit-label="提交申請" @submit="handleSubmit" :disabled="isSubmitting"
                            #default="{ value }">
                            <!-- 請假類型 -->
                            <form-kit type="l-select" :options="LEAVE_TYPES" label="請假類型" name="type"
                                validation="required" help="請選擇您要申請的假期類型" />

                            <!-- 開始日期 -->
                            <form-kit type="l-date-picker" label="開始日期" name="from_date" validation="required"
                                :min="new Date().toISOString().split('T')[0]" />

                            <!-- 全天假期選項 (年假、病假、無薪假) -->
                            <template v-if="value.type === 0 || value.type === 1 || value.type === 4">
                                <form-kit type="l-select" :options="AMPM_OPTIONS" label="開始時間" name="from_time"
                                    validation="required" />

                                <form-kit type="l-date-picker" label="結束日期" name="to_date" validation="required"
                                    :min="value.from_date" />

                                <form-kit type="l-select" :options="AMPM_OPTIONS" label="結束時間" name="to_time"
                                    validation="required" />

                                <!-- 顯示預估請假天數 -->
                                <div v-if="value.from_date && value.to_date && value.from_time !== undefined && value.to_time !== undefined"
                                    class="q-mt-md">
                                    <q-banner class="bg-blue-1">
                                        <template v-slot:avatar>
                                            <q-icon name="info" color="blue" />
                                        </template>
                                        預估請假天數: {{ calculateLeaveDays(value.from_date, value.to_date, value.from_time,
                                            value.to_time) }} 天
                                    </q-banner>
                                </div>
                            </template>

                            <!-- 時薪年假選項 -->
                            <template v-if="value.type === 3">
                                <form-kit type="l-time-picker" label="開始時間" name="start_time" validation="required" />

                                <form-kit type="l-input" label="小時數" name="hour"
                                    validation="required|number|min:0.5|max:8" input-type="number" step="0.5" number
                                    help="請輸入 0.5 到 8 小時之間的數值" />

                                <!-- 顯示預估請假小時 -->
                                <div v-if="value.hour" class="q-mt-md">
                                    <q-banner class="bg-orange-1">
                                        <template v-slot:avatar>
                                            <q-icon name="schedule" color="orange" />
                                        </template>
                                        申請時薪年假: {{ value.hour }} 小時
                                    </q-banner>
                                </div>
                            </template>

                            <!-- 備註 -->
                            <form-kit type="l-input" label="備註" name="remark" input-type="textarea" help="請簡述請假原因(選填)"
                                rows="3" />

                        </form-kit>
                    </q-card-section>
                </q-card>

                <!-- 提交成功頁面 -->
                <q-card v-else class="text-center">
                    <q-card-section class="q-pa-xl">
                        <q-icon name="check_circle" color="green" size="64px" class="q-mb-md" />
                        <div class="text-h5 q-mb-md">申請提交成功！</div>
                        <div class="text-body1 text-grey-6 q-mb-lg">
                            您的請假申請已成功提交，請等待主管審核。<br>
                            系統將自動返回主頁面...
                        </div>
                        <l-btn label="立即返回" color="primary" @click="navigateTo('/my/portal')" />
                    </q-card-section>
                </q-card>
            </div>
        </div>
    </q-page>
</template>

<style scoped>
.q-card {
    border-radius: 12px;
}

.q-banner {
    border-radius: 8px;
}

.text-h4 {
    font-weight: bold;
}

/* 響應式調整 */
@media (max-width: 600px) {
    .row.q-gutter-md>div {
        margin-bottom: 16px;
    }
}

/* 表單樣式優化 */
:deep(.formkit-outer) {
    margin-bottom: 24px;
}

:deep(.formkit-help) {
    font-size: 12px;
    color: #666;
    margin-top: 4px;
}

/* 載入狀態樣式 */
.loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
}
</style>
