import { Car, Star, DollarSign, Calendar } from 'lucide-react';

export const currentUser = {
    name: "John Doe",
    email: "john.doe@example.com",
    role: "Owner",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    phone: "+1 (555) 000-0000",
    location: "Los Angeles, CA",
    joinedDate: "Jan 2023"
};

export const dashboardStats = [
    {
        label: 'Total Revenue',
        value: 'Rs 8,877',
        subtext: '+12% from last month',
        subtextClass: 'text-green-600',
        icon: DollarSign
    },
    {
        label: 'Total Bookings',
        value: '73',
        subtext: '+8% from last month',
        subtextClass: 'text-green-600',
        icon: Calendar
    },
    {
        label: 'Active Vehicles',
        value: '2',
        subtext: '3 total vehicles',
        subtextClass: 'text-gray-500',
        icon: Car
    },
    {
        label: 'Average Rating',
        value: '4.9/5.0',
        subtext: '57 total reviews',
        subtextClass: 'text-gray-500',
        icon: Star
    }
];

export const pendingRequests = [
    {
        id: 1,
        renter: {
            name: "John Smith",
            initials: "JS",
            avatarColor: "bg-gray-200",
            textColor: "text-gray-600"
        },
        vehicle: "2023 Tesla Model 3",
        dates: "Jan 18 - Jan 22",
        amount: "Rs 356",
        status: "Pending"
    },
    {
        id: 2,
        renter: {
            name: "Emma Wilson",
            initials: "EW",
            avatarColor: "bg-orange-100",
            textColor: "text-orange-600"
        },
        vehicle: "2022 BMW X5",
        dates: "Jan 20 - Jan 23",
        amount: "Rs 387",
        status: "Pending"
    }
];

export const recentActivity = [
    {
        id: 1,
        type: "booking",
        title: "New booking confirmed",
        description: "2023 Tesla Model 3 • Jan 18-22",
        time: "2h ago",
        icon: Calendar,
        iconColor: "text-green-600",
        bgColor: "bg-green-50"
    },
    {
        id: 2,
        type: "review",
        title: "New 5-star review received",
        description: "2022 BMW X5",
        time: "5h ago",
        icon: Star,
        iconColor: "text-blue-600",
        bgColor: "bg-blue-50"
    },
    {
        id: 3,
        type: "payment",
        title: "Payment received",
        description: "Rs 387 for completed booking",
        time: "1d ago",
        icon: DollarSign,
        iconColor: "text-orange-600",
        bgColor: "bg-orange-50"
    }
];

export const myVehicles = [
    {
        id: 1,
        name: "Tesla Model 3",
        year: 2023,
        type: "Electric",
        image: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        rating: 4.9,
        trips: 12,
        earned: "Rs 1.2k",
        status: "Active"
    },
    {
        id: 2,
        name: "BMW X5",
        year: 2022,
        type: "SUV",
        image: "https://images.unsplash.com/photo-1555215696-b9776f1783e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        rating: 4.8,
        trips: 8,
        earned: "Rs 850",
        status: "Active"
    }
];

export const earningsData = {
    summary: {
        thisMonth: { value: "Rs 355", change: "15% from last month" },
        lastMonth: { value: "Rs 310", bookings: "23" },
        allTime: { value: "Rs 8,877", bookings: "73" }
    },
    transactions: [
        { id: 1, car: "Tesla Model 3", user: "John Smith", date: "Jan 15, 2026", amount: "+Rs 356", status: "Completed" },
        { id: 2, car: "BMW X5", user: "Emma Wilson", date: "Jan 14, 2026", amount: "+Rs 356", status: "Completed" },
        { id: 3, car: "Mercedes GLE", user: "Michael Brown", date: "Jan 12, 2026", amount: "+Rs 356", status: "Completed" },
        { id: 4, car: "Tesla Model 3", user: "Sarah Davis", date: "Jan 10, 2026", amount: "+Rs 356", status: "Completed" },
    ]
};

export const userProfile = {
    name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    role: "Renter",
    memberSince: "January 2024",
    isVerified: true,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    coverImage: "https://images.unsplash.com/photo-1579353977828-2a4eab540b9a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
    stats: {
        totalRentals: 12,
        savedVehicles: 5,
        renterRating: 4.9,
        monthsActive: 8
    }
};

export const userBookings = [
    {
        id: 1,
        vehicle: {
            name: "Tesla Model 3",
            image: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
            owner: "John Doe"
        },
        dates: "Jan 25 - Jan 28, 2026",
        status: "Upcoming",
        total: "Rs 450",
        bookingId: "#BK-2026-001"
    },
    {
        id: 2,
        vehicle: {
            name: "BMW X5",
            image: "https://images.unsplash.com/photo-1555215696-b9776f1783e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
            owner: "Alice Smith"
        },
        dates: "Dec 10 - Dec 15, 2025",
        status: "Completed",
        total: "Rs 620",
        bookingId: "#BK-2025-089"
    },
    {
        id: 3,
        vehicle: {
            name: "Mercedes GLE",
            image: "https://images.unsplash.com/photo-1605559424843-9e4c2287f386?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
            owner: "Bob Wilson"
        },
        dates: "Nov 05 - Nov 08, 2025",
        status: "Cancelled",
        total: "Rs 380",
        bookingId: "#BK-2025-055"
    }
];

export const savedVehicles = [
    {
        id: 1,
        name: "Porsche 911",
        type: "Sports",
        price: "Rs 250/day",
        rating: 5.0,
        trips: 15,
        image: "https://images.unsplash.com/photo-1503376763036-066120622c74?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    },
    {
        id: 2,
        name: "Range Rover Sport",
        type: "SUV",
        price: "Rs 180/day",
        rating: 4.8,
        trips: 22,
        image: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    },
    {
        id: 3,
        name: "Audi RS7",
        type: "Luxury",
        price: "Rs 220/day",
        rating: 4.9,
        trips: 10,
        image: "https://images.unsplash.com/photo-1617788138017-80ad40651399?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    }
];
