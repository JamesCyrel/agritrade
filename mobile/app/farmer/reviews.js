import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { farmerReviewAPI } from "../../services/api";

export default function ReviewsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      const res = await farmerReviewAPI.getReviews(token);
      
      if (res.success) {
        setReviews(res.data.reviews || []);
        setStats(res.data.stats || null);
      }
    } catch (error) {
      console.error("Load reviews error:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReviews();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2d5016" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header Stats */}
      {stats && (
        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <Text style={styles.statsTitle}>Rating Overview</Text>
            <View style={styles.overallRating}>
              <Text style={styles.overallRatingValue}>
                {parseFloat(stats.average_rating || 0).toFixed(1)}
              </Text>
              <Text style={styles.overallRatingStars}>
                {Array.from({ length: 5 }, (_, i) => 
                  i < Math.round(stats.average_rating || 0) ? "⭐" : "☆"
                ).join("")}
              </Text>
            </View>
            <Text style={styles.totalReviews}>
              {stats.total_reviews || 0} Total Reviews
            </Text>
          </View>

          {/* Rating Breakdown */}
          <View style={styles.ratingBreakdown}>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>5 ⭐</Text>
              <View style={styles.ratingBar}>
                <View
                  style={[
                    styles.ratingBarFill,
                    {
                      width: `${((stats.five_star || 0) / (stats.total_reviews || 1)) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.ratingCount}>{stats.five_star || 0}</Text>
            </View>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>4 ⭐</Text>
              <View style={styles.ratingBar}>
                <View
                  style={[
                    styles.ratingBarFill,
                    {
                      width: `${((stats.four_star || 0) / (stats.total_reviews || 1)) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.ratingCount}>{stats.four_star || 0}</Text>
            </View>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>3 ⭐</Text>
              <View style={styles.ratingBar}>
                <View
                  style={[
                    styles.ratingBarFill,
                    {
                      width: `${((stats.three_star || 0) / (stats.total_reviews || 1)) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.ratingCount}>{stats.three_star || 0}</Text>
            </View>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>2 ⭐</Text>
              <View style={styles.ratingBar}>
                <View
                  style={[
                    styles.ratingBarFill,
                    {
                      width: `${((stats.two_star || 0) / (stats.total_reviews || 1)) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.ratingCount}>{stats.two_star || 0}</Text>
            </View>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>1 ⭐</Text>
              <View style={styles.ratingBar}>
                <View
                  style={[
                    styles.ratingBarFill,
                    {
                      width: `${((stats.one_star || 0) / (stats.total_reviews || 1)) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.ratingCount}>{stats.one_star || 0}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Reviews List */}
      <View style={styles.reviewsSection}>
        <Text style={styles.reviewsSectionTitle}>All Reviews</Text>
        {reviews.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>⭐</Text>
            <Text style={styles.emptyStateText}>No reviews yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Reviews from customers will appear here
            </Text>
          </View>
        ) : (
          reviews.map((review) => (
            <View key={review.review_id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewHeaderLeft}>
                  <Text style={styles.reviewerName}>
                    {review.consumer_name || review.consumer_email || "Anonymous"}
                  </Text>
                  {review.product_name && (
                    <Text style={styles.reviewProduct}>
                      Product: {review.product_name}
                    </Text>
                  )}
                  {review.order_number && (
                    <Text style={styles.reviewOrder}>
                      Order: {review.order_number}
                    </Text>
                  )}
                </View>
                <View style={styles.reviewRating}>
                  <Text style={styles.reviewRatingStars}>
                    {Array.from({ length: 5 }, (_, i) => 
                      i < review.rating ? "⭐" : "☆"
                    ).join("")}
                  </Text>
                </View>
              </View>
              
              {review.comment && (
                <Text style={styles.reviewComment}>{review.comment}</Text>
              )}
              
              <Text style={styles.reviewDate}>
                {formatDate(review.created_at)}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  statsCard: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  overallRating: {
    alignItems: "center",
    marginBottom: 8,
  },
  overallRatingValue: {
    fontSize: 48,
    fontWeight: "700",
    color: "#2d5016",
    marginBottom: 4,
  },
  overallRatingStars: {
    fontSize: 24,
    marginBottom: 8,
  },
  totalReviews: {
    fontSize: 14,
    color: "#666",
  },
  ratingBreakdown: {
    marginTop: 16,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingLabel: {
    fontSize: 14,
    color: "#666",
    width: 40,
  },
  ratingBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: "hidden",
  },
  ratingBarFill: {
    height: "100%",
    backgroundColor: "#2d5016",
    borderRadius: 4,
  },
  ratingCount: {
    fontSize: 14,
    color: "#666",
    width: 30,
    textAlign: "right",
  },
  reviewsSection: {
    padding: 16,
  },
  reviewsSectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  reviewHeaderLeft: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  reviewProduct: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  reviewOrder: {
    fontSize: 12,
    color: "#999",
  },
  reviewRating: {
    alignItems: "flex-end",
  },
  reviewRatingStars: {
    fontSize: 16,
  },
  reviewComment: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewDate: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
});

