package com.joao_v_marques.dashboard_esg.lawsuits.lawsuit;

import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_status.LawsuitStatus;
import com.joao_v_marques.dashboard_esg.lawsuits.loss_probability.LossProbability;
import com.joao_v_marques.dashboard_esg.lawsuits.proceeding_stage.ProceedingStage;
import com.joao_v_marques.dashboard_esg.lawsuits.subject_matter.SubjectMatter;
import com.joao_v_marques.dashboard_esg.users.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "lawsuits")
@Getter
@Setter
@NoArgsConstructor
public class Lawsuit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "lawsuit_date", nullable = false)
    private LocalDate lawsuitDate;

    @Column(name = "case_number", nullable = false, unique = true)
    private String caseNumber;

    @Column(name = "plaintiff", nullable = false)
    private String plaintiff;

    @Column(name = "defendant", nullable = false)
    private String defendant;

    @Column(name = "claim_value", nullable = false)
    private BigDecimal claimValue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_matter_id", nullable = false)
    private SubjectMatter subjectMatter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proceeding_stage_id", nullable = false)
    private ProceedingStage proceedingStage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "status_id", nullable = false)
    private LawsuitStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loss_probability_id", nullable = false)
    private LossProbability lossProbability;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inserted_by", nullable = false)
    private User insertedBy;

    @Column(name = "created_at")
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    // false = processo encerrado
    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "closed_at")
    private OffsetDateTime closedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "closed_by")
    private User closedBy;
}
