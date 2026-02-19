import { dbService } from '../lib/supabase';
import { Contract, RentReceipt } from '../types/db';
import { differenceInDays, isSameDay, startOfDay } from 'date-fns';

const REMINDER_DAYS_BEFORE = 5;

export const paymentReminderService = {
    async checkAndSendReminders(agencyId: string, userId: string) {
        if (!agencyId || !userId) return;

        try {
            console.log('🔔 Checking payment reminders...');

            // 1. Get all active contracts
            const contracts = await dbService.contracts.getAll({
                agency_id: agencyId,
                status: 'active'
            });

            // 2. Get notifications for today to avoid duplicates
            // We'll fetch the last 50 notifications for this user to check against
            const recentNotifications = await dbService.notifications.getByUser(userId);

            const today = new Date();
            const currentMonth = today.getMonth() + 1;
            const currentYear = today.getFullYear();

            for (const contract of contracts) {
                if (!contract.tenant_id) continue;

                // Calculate due date for this month
                const startDate = new Date(contract.start_date);
                const dueDay = startDate.getDate();

                // Construct due date for current month
                // Handle edge cases (e.g. 31st when month has 30 days)
                let dueDate = new Date(currentYear, currentMonth - 1, dueDay);

                // If the calculated month is different (overflow), set to last day of intended month
                if (dueDate.getMonth() !== currentMonth - 1) {
                    dueDate = new Date(currentYear, currentMonth, 0);
                }

                // Check if we are in the reminder window
                // Window starts 5 days before due date
                // And continues as long as it's not paid (we could limit it to X days after to avoid spam forever, but user said "until paid")

                // Calculate days difference: DueDate - Today 
                // If diff is 5, it means 5 days remaining.
                // If diff is 0, it's today.
                // If diff is negative, it's overdue.

                const diffDays = differenceInDays(dueDate, startOfDay(today));

                // Logic: Notify if within 5 days before OR overdue
                if (diffDays <= REMINDER_DAYS_BEFORE) {

                    // 3. Check if paid for this month
                    // We need to query rent receipts for this contract and this period
                    // Since we don't have a direct "getReceiptByPeriod" method exposed in the service interface as granular as we need,
                    // we might have to fetch all receipts for this contract or trust a new method.
                    // For MVP efficiency, we'll fetch all receipts for the agency (cached by react-query usually, but here we are in a service)
                    // Better: Add a specific query or use what we have. 
                    // Let's assume we fetch receipts for this contract specifically if possible, or filter from a larger list if cached.
                    // For this implementation, let's fetch receipts for this specific contract to be safe and accurate.

                    // Note: contractsService.getAll doesn't return receipts. 
                    // We should use supabase directly or add a method. 
                    // Let's use dbService.rentReceipts.getAll with a filter if possible, or just fetch directly here.

                    // We will filter in memory since getAll doesn't support contract_id filtering yet based on previous file read

                    const receipts = await dbService.rentReceipts.getAll({
                        agency_id: agencyId,
                        // We will filter in memory since getAll doesn't support contract_id filtering yet based on previous file read
                    });

                    const isPaid = receipts.some(r =>
                        r.contract_id === contract.id &&
                        r.period_month === currentMonth &&
                        r.period_year === currentYear
                    );

                    if (!isPaid) {
                        // 4. Check if we already notified TODAY
                        // Filter notifications for this contract and today's date in metadata
                        const alreadyNotifiedToday = recentNotifications.some(n => {
                            const data = n.data as { contract_id?: string } | null;
                            const isSameContract = data?.contract_id === contract.id;
                            const isPaymentType = n.type === 'payment_reminder';
                            const notifDate = new Date(n.created_at);
                            const isToday = isSameDay(notifDate, today);
                            return isSameContract && isPaymentType && isToday;
                        });

                        if (!alreadyNotifiedToday) {
                            await sendNotification(contract, diffDays, userId, dueDate);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error checking reminders:', error);
        }
    }
};

async function sendNotification(contract: Contract, diffDays: number, userId: string, dueDate: Date) {
    let title = '';
    let message = '';
    const tenantName = `${contract.tenant?.first_name || 'Locataire'} ${contract.tenant?.last_name || ''}`;

    if (diffDays > 0) {
        title = `📅 Rappel Paiement: ${tenantName}`;
        message = `Le loyer de ${tenantName} arrive à échéance dans ${diffDays} jours (le ${dueDate.toLocaleDateString('fr-FR')}).`;
    } else if (diffDays === 0) {
        title = `📅 Loyer dû aujourd'hui: ${tenantName}`;
        message = `Le loyer de ${tenantName} doit être réglé aujourd'hui.`;
    } else {
        const overdueDays = Math.abs(diffDays);
        title = `⚠️ Retard Paiement: ${tenantName}`;
        message = `Le loyer de ${tenantName} est en retard de ${overdueDays} jours.`;
    }

    await dbService.notifications.create({
        user_id: userId,
        type: 'payment_reminder',
        title: title,
        message: message,
        data: { contract_id: contract.id, tenant_id: contract.tenant_id },
        is_read: false,
        priority: diffDays < 0 ? 'high' : 'medium',
        agency_id: contract.agency_id // Ensure we pass agency_id if required by RLS or DB
    });

    console.log(`Notification sent for contract ${contract.id}: ${title}`);
}
