// Generate test data for admin portal
export const generateTestData = () => {
    const sports = ['Cricket', 'Football', 'Badminton', 'Tennis', 'Basketball', 'Padel', 'Volleyball'];
    const cities = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar'];
    const names = ['Ali', 'Ahmed', 'Fatima', 'Zainab', 'Usman', 'Sara', 'Bilal', 'Ayesha', 'Kamran', 'Nida'];
    const arenas = ['Elite', 'Pro', 'City', 'Sky', 'Royal', 'Grand', 'Premium', 'Sports', 'Champion', 'Victory'];

    // Generate 20 test users
    const testUsers = Array.from({ length: 20 }, (_, i) => ({
        user_id: i + 1,
        name: `${names[i % names.length]} ${names[(i + 2) % names.length]}`,
        email: `user${i + 1}@example.com`,
        phone_number: `+92${3000000000 + i}`,
        total_bookings: Math.floor(Math.random() * 30) + 1,
        favorite_arenas_count: Math.floor(Math.random() * 10),
        is_logged_in: Math.random() > 0.5,
        last_login: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    }));

    // Generate 15 test owners
    const testOwners = Array.from({ length: 15 }, (_, i) => ({
        owner_id: i + 1,
        arena_name: `${arenas[i % arenas.length]} ${sports[i % sports.length]} Arena`,
        email: `owner${i + 1}@example.com`,
        phone_number: `+92${3100000000 + i}`,
        total_arenas: Math.floor(Math.random() * 5) + 1,
        total_bookings: Math.floor(Math.random() * 200) + 20,
        total_revenue: Math.floor(Math.random() * 2000000) + 500000,
        is_active: Math.random() > 0.2,
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    }));

    // Generate 25 test arenas
    const testArenas = Array.from({ length: 25 }, (_, i) => ({
        arena_id: i + 1,
        name: `${arenas[i % arenas.length]} ${sports[i % sports.length]} Center`,
        owner_name: testOwners[i % testOwners.length].arena_name,
        owner_email: testOwners[i % testOwners.length].email,
        owner_phone: testOwners[i % testOwners.length].phone_number,
        total_bookings: Math.floor(Math.random() * 150) + 10,
        total_revenue: Math.floor(Math.random() * 1500000) + 300000,
        is_active: Math.random() > 0.1,
        is_blocked: Math.random() > 0.8,
        rating: (Math.random() * 2 + 3).toFixed(1), // 3.0 to 5.0
        sports: [sports[i % sports.length], sports[(i + 1) % sports.length]],
        address: `${cities[i % cities.length]}, Pakistan`,
        created_at: new Date(Date.now() - Math.random() * 200 * 24 * 60 * 60 * 1000).toISOString()
    }));

    // Generate daily reports for last 30 days
    const dailyReports = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        const bookings = Math.floor(Math.random() * 60) + 20;
        const revenue = bookings * (Math.floor(Math.random() * 2000) + 1000);
        const commission = revenue * 0.05; // 5% commission

        return {
            date: date.toISOString().split('T')[0],
            total_bookings: bookings,
            total_revenue: revenue,
            total_commission: commission,
            unique_customers: Math.floor(bookings * 0.7),
            active_arenas: Math.floor(Math.random() * 15) + 10
        };
    });

    // Generate commission payments
    const commissionPayments = testArenas.map((arena, i) => {
        const amount_due = Math.floor(Math.random() * 50000) + 5000;
        const days_overdue = Math.floor(Math.random() * 10);
        const status = days_overdue > 7 ? 'overdue' :
            days_overdue > 3 ? 'pending' :
                Math.random() > 0.5 ? 'paid' : 'pending';

        return {
            payment_id: i + 1,
            arena_id: arena.arena_id,
            arena_name: arena.name,
            owner_name: arena.owner_name,
            amount_due: amount_due,
            amount_paid: status === 'paid' ? amount_due : 0,
            due_date: new Date(Date.now() - days_overdue * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            payment_date: status === 'paid' ?
                new Date(Date.now() - (days_overdue - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0] :
                null,
            late_fee_amount: days_overdue > 3 ? amount_due * 0.03 : 0,
            status: status,
            days_overdue: days_overdue,
            created_at: new Date(Date.now() - (days_overdue + 10) * 24 * 60 * 60 * 1000).toISOString()
        };
    });

    // Generate recent bookings
    const recentBookings = Array.from({ length: 15 }, (_, i) => {
        const statuses = ['completed', 'pending', 'cancelled'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const date = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

        return {
            booking_id: 1000 + i,
            user_name: testUsers[i % testUsers.length].name,
            arena_name: testArenas[i % testArenas.length].name,
            owner_name: testArenas[i % testArenas.length].owner_name,
            sport_name: sports[i % sports.length],
            booking_date: date.toISOString(),
            total_amount: Math.floor(Math.random() * 4000) + 1000,
            status: status
        };
    });

    return {
        testUsers,
        testOwners,
        testArenas,
        dailyReports,
        commissionPayments,
        recentBookings
    };
};

// Generate dashboard stats
export const generateDashboardStats = () => {
    const data = generateTestData();

    const monthlyCommission = data.dailyReports
        .slice(-30)
        .reduce((sum, report) => sum + report.total_commission, 0);

    const activeArenas = data.testArenas.filter(a => a.is_active && !a.is_blocked).length;
    const pendingCommissionsCount = data.commissionPayments.filter(p => p.status === 'pending' || p.status === 'overdue').length;

    return {
        monthlyCommission: Math.round(monthlyCommission),
        activeArenas,
        pendingCommissionsCount,
        totalUsers: data.testUsers.length,
        totalOwners: data.testOwners.length,
        totalBookings: data.dailyReports.reduce((sum, r) => sum + r.total_bookings, 0),
        totalRevenue: data.dailyReports.reduce((sum, r) => sum + r.total_revenue, 0),
        totalPlatformCommission: data.dailyReports.reduce((sum, r) => sum + r.total_commission, 0),
        recentBookings: data.recentBookings.sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date)).slice(0, 10),
        pendingCommissions: data.commissionPayments
            .filter(p => p.status === 'pending' || p.status === 'overdue')
            .sort((a, b) => b.days_overdue - a.days_overdue)
            .slice(0, 5)
    };
};