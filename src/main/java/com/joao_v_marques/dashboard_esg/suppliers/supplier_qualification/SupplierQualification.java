package com.joao_v_marques.dashboard_esg.suppliers.supplier_qualification;

import com.joao_v_marques.dashboard_esg.suppliers.qualification_result.QualificationResult;
import com.joao_v_marques.dashboard_esg.suppliers.supplier.Supplier;
import com.joao_v_marques.dashboard_esg.users.sector.Sector;
import com.joao_v_marques.dashboard_esg.users.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "supplier_qualifications")
@Getter
@Setter
@NoArgsConstructor
public class SupplierQualification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id", nullable = false)
    private Supplier supplier;

    @Column(name = "filled_by_name", nullable = false)
    private String filledByName;

    @Column(name = "filled_by_position", nullable = false)
    private String filledByPosition;

    @Column(name = "filled_at", nullable = false)
    private LocalDate filledAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "result_id", nullable = false)
    private QualificationResult result;

    @Column(name = "result_notes")
    private String resultNotes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "qualified_by", nullable = false)
    private User qualifiedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sector_id", nullable = false)
    private Sector sector;

    @Column(name = "qualification_date", nullable = false)
    private LocalDate qualificationDate;

    @Column(name = "board_approval_notes")
    private String boardApprovalNotes;

    @Column(name = "created_at")
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;
}
