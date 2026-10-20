package com.joao_v_marques.dashboard_esg.nips.nip;

import com.joao_v_marques.dashboard_esg.nips.nip_status.NipStatus;
import com.joao_v_marques.dashboard_esg.nips.nips_nature.NipNature;
import com.joao_v_marques.dashboard_esg.users.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "nips")
@Getter
@Setter
@NoArgsConstructor
public class Nip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "nip_number", nullable = false, unique = true)
    private String nipNumber;

    @Column(name = "notification_date", nullable = false)
    private LocalDate notificationDate;

    @Column(name = "demand_code", nullable = false)
    private String demandCode;

    @Column(name = "protocol_code", nullable = false, unique = true)
    private String protocolCode;

    @Column(name = "beneficiary_name", nullable = false)
    private String beneficiaryName;

    // Coluna CHAR(11) no banco: sem o tipo explícito o Hibernate espera VARCHAR e o validate falha
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "beneficiary_cpf", nullable = false, length = 11)
    private String beneficiaryCpf;

    @Column(name = "description")
    private String description;

    @Column(name = "response_description")
    private String responseDescription;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "status_id", nullable = false)
    private NipStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "nature_id", nullable = false)
    private NipNature nature;

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
}
