package com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_appeal;

import com.joao_v_marques.dashboard_esg.lawsuits.judging_body.JudgingBody;
import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit.Lawsuit;
import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_status.LawsuitStatus;
import com.joao_v_marques.dashboard_esg.lawsuits.loss_probability.LossProbability;
import com.joao_v_marques.dashboard_esg.users.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "lawsuit_appeals")
@Getter
@Setter
@NoArgsConstructor
public class LawsuitAppeal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // Processo de origem: um processo pode ter vários recursos
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lawsuit_id", nullable = false)
    private Lawsuit lawsuit;

    @Column(name = "appeal_date", nullable = false)
    private LocalDate appealDate;

    @Column(name = "appeal_number", nullable = false)
    private String appealNumber;

    @Column(name = "appellant", nullable = false)
    private String appellant;

    @Column(name = "appellee", nullable = false)
    private String appellee;

    @Column(name = "claim_value", nullable = false)
    private BigDecimal claimValue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "judging_body_id", nullable = false)
    private JudgingBody judgingBody;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "status_id", nullable = false)
    private LawsuitStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loss_probability_id", nullable = false)
    private LossProbability lossProbability;

    // Ordem do recurso dentro do processo (UNIQUE junto com lawsuit_id)
    @Column(name = "appeal_sequence", nullable = false)
    private Integer appealSequence;

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

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;
}
