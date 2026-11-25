package com.joao_v_marques.dashboard_esg.suppliers.supplier_qualification;

import com.joao_v_marques.dashboard_esg.shared.exceptions.ResourceNotFoundException;
import com.joao_v_marques.dashboard_esg.shared.security.UserPrincipal;
import com.joao_v_marques.dashboard_esg.suppliers.qualification_result.QualificationResult;
import com.joao_v_marques.dashboard_esg.suppliers.qualification_result.QualificationResultRepository;
import com.joao_v_marques.dashboard_esg.suppliers.supplier.Supplier;
import com.joao_v_marques.dashboard_esg.suppliers.supplier.SupplierRepository;
import com.joao_v_marques.dashboard_esg.suppliers.supplier_qualification.dto.SupplierQualificationRequest;
import com.joao_v_marques.dashboard_esg.suppliers.supplier_qualification.dto.SupplierQualificationResponse;
import com.joao_v_marques.dashboard_esg.users.user.User;
import com.joao_v_marques.dashboard_esg.users.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class SupplierQualificationService {

    // ID do resultado "Aprovado" (seed da migration V5); os demais resultados exigem observação
    private static final Integer APPROVED_RESULT_ID = 1;

    private final SupplierQualificationRepository repository;
    private final SupplierRepository supplierRepository;
    private final QualificationResultRepository qualificationResultRepository;
    private final UserRepository userRepository;

    public SupplierQualificationService(SupplierQualificationRepository repository, SupplierRepository supplierRepository, QualificationResultRepository qualificationResultRepository, UserRepository userRepository) {
        this.repository = repository;
        this.supplierRepository = supplierRepository;
        this.qualificationResultRepository = qualificationResultRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<SupplierQualificationResponse> findAll() {
        return repository.findAllByOrderByCreatedAtAscIdAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public SupplierQualificationResponse create(SupplierQualificationRequest request, UserPrincipal currentUser) {
        // Validação da FK de supplier, precisa existir e estar ativo
        Supplier supplier = supplierRepository.findById(request.supplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum fornecedor com o ID informado."));
        if (!supplier.isActive()) {
            throw new IllegalArgumentException("O fornecedor informado está inativo.");
        }

        // Validação da FK de result, precisa existir e estar ativo
        QualificationResult result = qualificationResultRepository.findById(request.resultId())
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado nenhum resultado de qualificação com o ID informado."));
        if (!result.isActive()) {
            throw new IllegalArgumentException("O resultado de qualificação informado está inativo.");
        }

        // Observação obrigatória quando o resultado não for Aprovado
        if (!APPROVED_RESULT_ID.equals(result.getId()) && !StringUtils.hasText(request.resultNotes())) {
            throw new IllegalArgumentException("Informe a observação do resultado quando a qualificação for Aprovado com restrição ou Reprovado.");
        }

        // Usuário logado que lançou a ficha; o setor gravado é o dele no momento do lançamento
        User qualifiedBy = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrado usuário com o ID informado."));

        // Transformar a DTO de request em entidade
        SupplierQualification qualification = new SupplierQualification();
        qualification.setSupplier(supplier);
        qualification.setFilledByName(request.filledByName().trim());
        qualification.setFilledByPosition(request.filledByPosition().trim());
        qualification.setFilledAt(request.filledAt());
        qualification.setResult(result);
        qualification.setResultNotes(trimToNull(request.resultNotes()));
        qualification.setQualifiedBy(qualifiedBy);
        qualification.setSector(qualifiedBy.getSector());
        qualification.setQualificationDate(request.qualificationDate());
        qualification.setBoardApprovalNotes(trimToNull(request.boardApprovalNotes()));

        repository.save(qualification);

        return toResponse(qualification);
    }

    // Campos opcionais: string em branco vira null no banco
    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private SupplierQualificationResponse toResponse(SupplierQualification qualification) {
        return new SupplierQualificationResponse(
                qualification.getId(),
                qualification.getSupplier().getId(),
                qualification.getSupplier().getCorporateName(),
                qualification.getFilledByName(),
                qualification.getFilledByPosition(),
                qualification.getFilledAt(),
                qualification.getResult().getId(),
                qualification.getResult().getName(),
                qualification.getResultNotes(),
                qualification.getQualifiedBy().getName(),
                qualification.getSector().getId(),
                qualification.getSector().getName(),
                qualification.getQualificationDate(),
                qualification.getBoardApprovalNotes(),
                qualification.getCreatedAt(),
                qualification.getUpdatedAt(),
                qualification.getUpdatedBy() != null ? qualification.getUpdatedBy().getName() : null
        );
    }
}
